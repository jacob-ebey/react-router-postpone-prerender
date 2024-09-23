import * as React from "react";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";
import { loadResources } from "~/api";
import { iconMappings } from "~/icons";
import { postponed } from "~/lib";

export async function loader({ request }: LoaderFunctionArgs) {
  const prerender = request.headers.get("X-React-Router-Prerender") === "yes";

  return {
    resourcesLength: 4,
    resources: postponed(prerender, () => loadResources()),
  };
}

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-16">
        <header className="flex flex-col items-center gap-9">
          <h1 className="leading text-2xl font-bold text-gray-800 dark:text-gray-100">
            Welcome to <span className="sr-only">Remix</span>
          </h1>
          <div className="h-[144px] w-[434px]">
            <img
              src="/logo-light.png"
              alt="Remix"
              className="block w-full dark:hidden"
            />
            <img
              src="/logo-dark.png"
              alt="Remix"
              className="hidden w-full dark:block"
            />
          </div>
        </header>
        <nav className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-gray-200 p-6 dark:border-gray-700">
          <p className="leading-6 text-gray-700 dark:text-gray-200">
            What&apos;s next?
          </p>
          <React.Suspense fallback={<ResourcesFallback />}>
            <Resources />
          </React.Suspense>
        </nav>
      </div>
    </div>
  );
}

function ResourcesFallback() {
  const { resourcesLength } = useLoaderData() as Awaited<
    ReturnType<typeof loader>
  >;

  return (
    <ul>
      {Array.from({ length: resourcesLength }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
        <li key={i}>
          <div className="flex items-center gap-3 p-3 leading-normal text-gray-700 dark:text-gray-200">
            <div className="animate-pulse w-6 h-6 bg-gray-300 dark:bg-gray-700 rounded-full" />
            <div className="animate-pulse w-1/2 h-4 bg-gray-300 dark:bg-gray-700 rounded-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Resources() {
  const { resources } = useLoaderData() as Awaited<ReturnType<typeof loader>>;

  return (
    <ul>
      {React.use(resources).map(({ href, text, icon }) => {
        const Icon = iconMappings[icon];
        return (
          <li key={href}>
            <a
              className="group flex items-center gap-3 self-stretch p-3 leading-normal text-blue-700 hover:underline dark:text-blue-500"
              href={href}
              target="_blank"
              rel="noreferrer"
            >
              <Icon />
              {text}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
