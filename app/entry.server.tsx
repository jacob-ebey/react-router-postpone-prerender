import * as fsp from "node:fs/promises";
import * as nodeStream from "node:stream";

import * as React from "react";
import type { AppLoadContext, EntryContext } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
// @ts-expect-error - no types yet
import { prerenderToNodeStream } from "react-dom/static";
import {
  renderToPipeableStream,
  // @ts-expect-error - no types yet
  resumeToPipeableStream,
} from "react-dom/server";

const ABORT_DELAY = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  loadContext: AppLoadContext
) {
  const isPrerender = request.headers.get("X-React-Router-Prerender") === "yes";

  const isBotRequest = isbot(request.headers.get("user-agent") || "");
  let status = responseStatusCode;
  const headers = new Headers(responseHeaders);
  headers.set("Content-Type", "text/html; charset=utf-8");

  // biome-ignore lint/suspicious/noAsyncPromiseExecutor: <explanation>
  return new Promise(async (resolve, reject) => {
    try {
      let shellRendered = false;

      const prerendered =
        !isPrerender && (await getPrerenderState(request.url));

      let postponed: unknown;
      const toSend = isPrerender
        ? await prerenderToNodeStream(
            <ServerRouter
              context={remixContext}
              url={request.url}
              abortDelay={ABORT_DELAY}
            />,
            {
              signal: request.signal,
              onAllReady() {
                if (!isBotRequest) return;

                sendResponse();
              },
              onShellError(error: unknown) {
                reject(error);
              },
              onError(error: unknown) {
                status = 500;
                // Log streaming rendering errors from inside the shell.  Don't log
                // errors encountered during initial shell rendering since they'll
                // reject and get logged in handleDocumentRequest.
                // if (shellRendered) {
                console.error(error);
                // }
              },
            }
          ).then((res: any) => {
            postponed = res.postponed;
            return res.prelude;
          })
        : prerendered
        ? resumeToPipeableStream(
            <ServerRouter
              context={remixContext}
              url={request.url}
              abortDelay={ABORT_DELAY}
            />,
            prerendered.reactState,
            {
              onAllReady() {
                if (!isBotRequest) return;

                sendResponse();
              },
              onShellReady() {
                if (isBotRequest) return;

                sendResponse();
              },
              onShellError(error: unknown) {
                reject(error);
              },
              onError(error: unknown) {
                status = 500;
                // Log streaming rendering errors from inside the shell.  Don't log
                // errors encountered during initial shell rendering since they'll
                // reject and get logged in handleDocumentRequest.
                // if (shellRendered) {
                console.error(error);
                // }
              },
            }
          )
        : renderToPipeableStream(
            <ServerRouter
              context={remixContext}
              url={request.url}
              abortDelay={ABORT_DELAY}
            />,
            {
              onAllReady() {
                if (!isBotRequest) return;

                sendResponse();
              },
              onShellReady() {
                if (isBotRequest) return;

                sendResponse();
              },
              onShellError(error: unknown) {
                reject(error);
              },
              onError(error: unknown) {
                status = 500;
                // Log streaming rendering errors from inside the shell.  Don't log
                // errors encountered during initial shell rendering since they'll
                // reject and get logged in handleDocumentRequest.
                if (shellRendered) {
                  console.error(error);
                }
              },
            }
          );

      const sendResponse = () => {
        if (shellRendered) return;
        shellRendered = true;
        const body = new nodeStream.PassThrough();
        let stream = createReadableStreamFromReadable(
          toSend.pipe(body, { end: true })
        );

        if (prerendered) {
          const restStream = stream;
          const shellStream = new ReadableStream<Uint8Array>({
            async start(controller) {
              try {
                controller.enqueue(new TextEncoder().encode(prerendered.shell));
                controller.close();
              } catch (reason) {
                controller.error(reason);
              }
            },
          });

          stream = new ReadableStream<Uint8Array>({
            async start(controller) {
              try {
                let reader = shellStream.getReader();
                let result = await reader.read();
                while (!result.done) {
                  controller.enqueue(result.value);
                  result = await reader.read();
                }
                reader.releaseLock();
                reader = restStream.getReader();
                result = await reader.read();
                while (!result.done) {
                  controller.enqueue(result.value);
                  result = await reader.read();
                }
                reader.releaseLock();
                controller.close();
              } catch (reason) {
                controller.error(reason);
              }
            },
          });
        }

        resolve(
          new Response(stream, {
            headers,
            status,
          })
        );
      };

      if (isPrerender) {
        sendResponse();
      }
      if (postponed) {
        await fsp.mkdir("./build/server/postponed", { recursive: true });

        const url = new URL(request.url);
        // JSON file to save the postponed data
        const filename = `./build/server/postponed/${url.pathname.replace(
          /\\/g,
          "/"
        )}.json`;
        await fsp.writeFile(filename, JSON.stringify(postponed));
      }

      if (toSend.abort) {
        setTimeout(toSend.abort, ABORT_DELAY);
      }
    } catch (reason) {
      console.error(reason);
    }
  });
}

async function getPrerenderState(
  url: string
): Promise<{ reactState: unknown; shell: string } | undefined> {
  const stateFilename = `./build/server/postponed/${new URL(
    url
  ).pathname.replace(/\\/g, "/")}.json`;
  const shellFilename = `./build/server/prerendered/${new URL(
    url
  ).pathname.replace(/\\/g, "/")}.html`;
  const exists = await fsp
    .stat(stateFilename)
    .then((s) => s.isFile())
    .catch(() => false);
  if (!exists) return;
  try {
    const readStatePromise = fsp.readFile(stateFilename, "utf-8");
    const readShellPromise = fsp.readFile(shellFilename, "utf-8");
    return {
      reactState: JSON.parse(await readStatePromise),
      shell: await readShellPromise,
    };
  } catch {
    return;
  }
}
