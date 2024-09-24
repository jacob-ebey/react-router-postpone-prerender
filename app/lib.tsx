import * as React from "react";
import type { ScriptsProps } from "react-router";
import { Scripts, UNSAFE_FrameworkContext, useMatches } from "react-router";

export async function postponed<T>(
  postpone: boolean,
  fn: () => T | Promise<T>
): Promise<T> {
  if (postpone) {
    try {
      // @ts-expect-error - no types yet
      return React.unstable_postpone();
    } catch (reason) {
      return Promise.reject(reason);
    }
  }
  return Promise.resolve(fn());
}

export function PostponedScripts({
  postpone,
  ...props
}: { postpone: boolean } & ScriptsProps) {
  if (postpone) {
    // @ts-expect-error - no types yet
    throw React.unstable_postpone();
  }

  return (
    <React.Suspense
      fallback={<PostponedScriptsFallback crossOrigin={props.crossOrigin} />}
    >
      <Scripts {...props} />
    </React.Suspense>
  );
}

function PostponedScriptsFallback({
  crossOrigin,
}: {
  crossOrigin: ScriptsProps["crossOrigin"];
}) {
  const matches = useMatches();
  const ctx = React.useContext(UNSAFE_FrameworkContext);
  if (!ctx) {
    throw new Error(
      "PostponedScriptsFallback must be rendered within a React Router app."
    );
  }
  const { manifest } = ctx;

  const routePreloads = matches.flatMap((match) => {
    const route = manifest.routes[match.id];
    return (route.imports || []).concat([route.module]);
  });

  const scripts = new Set([
    manifest.entry.module,
    ...manifest.entry.imports,
    ...routePreloads,
  ]);

  return (
    <>
      {Array.from(scripts).map((script) => (
        <link
          key={script}
          rel="modulepreload"
          href={script}
          crossOrigin={crossOrigin}
        />
      ))}
    </>
  );
}
