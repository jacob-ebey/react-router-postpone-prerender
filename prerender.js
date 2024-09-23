import * as fsp from "node:fs/promises";

import { createRequestHandler } from "react-router";

import * as build from "./build/server/index.js";

const handler = createRequestHandler(build);

const prerenderRoutes = ["/"];

await fsp.mkdir("./build/server/prerendered", { recursive: true });

for (const route of prerenderRoutes) {
  const url = new URL(route, "http://prerender.com");

  const response = await handler(
    new Request(url, {
      headers: {
        "X-React-Router-Prerender": "yes",
      },
    })
  );
  const body = await response.text();

  if (response.status !== 200) {
    throw new Error(`Failed to prerender ${route}`);
  }

  const filename = `./build/server/prerendered/${url.pathname.replace(
    /\\/g,
    "/"
  )}.html`;
  await fsp.writeFile(filename, body);
}
