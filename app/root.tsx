import type { LinksFunction, LoaderFunctionArgs } from "react-router";
import {
  Links,
  Meta,
  Outlet,
  ScrollRestoration,
  useLoaderData,
} from "react-router";

import "./tailwind.css";

import { PostponedScripts } from "~/lib";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const prerender = request.headers.get("X-React-Router-Prerender") === "yes";
  return { prerender };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { prerender } = useLoaderData() as Awaited<ReturnType<typeof loader>>;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <PostponedScripts postpone={prerender} />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
