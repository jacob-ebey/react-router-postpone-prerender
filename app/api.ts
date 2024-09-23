import type { iconMappings } from "./icons";

export async function loadResources() {
  const resources: {
    href: string;
    text: string;
    icon: keyof typeof iconMappings;
  }[] = [
    {
      href: "https://remix.run/start/quickstart",
      text: "Quick Start (5 min)",
      icon: "lightning-bolt",
    },
    {
      href: "https://remix.run/start/tutorial",
      text: "Tutorial (30 min)",
      icon: "cursor-click",
    },
    {
      href: "https://remix.run/docs",
      text: "Remix Docs",
      icon: "atom",
    },
    {
      href: "https://rmx.as/discord",
      text: "Join Discord",
      icon: "discord",
    },
  ];
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return resources;
}
