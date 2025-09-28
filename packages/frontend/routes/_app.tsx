// routes/_app.tsx - Fresh 2 root layout (replaces App.tsx)
import type { PageProps } from "fresh";
import { Partial } from "fresh/runtime";
import { URL } from "node:url";

export default function App({ Component }: PageProps) {
  const publicURL = new URL(Deno.env.get("ORW_PUBLIC_URL") || "http://localhost:8000/");
  const url = publicURL.toString();
  const domain = publicURL.hostname;

  const storageURL = new URL(Deno.env.get("ORW_STORAGE_PUBLIC_URL") || "http://localhost:8000/");
  const screenshot = `${storageURL}screenshot.png`;

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="Explore OpenRouter's model list and recorded changes. Updates every hour."
        />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="OpenRouter API Watcher" />
        <meta
          property="og:description"
          content="Explore OpenRouter's model list and recorded changes. Updates every hour."
        />
        <meta property="og:image" content={screenshot} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="OpenRouter API Watcher" />
        <meta property="twitter:domain" content={domain} />
        <meta property="twitter:url" content={url} />
        <meta name="twitter:title" content="OpenRouter API Watcher" />
        <meta
          name="twitter:description"
          content="Explore OpenRouter's model list and recorded changes. Updates every hour."
        />
        <meta name="twitter:image" content={screenshot} />
        <meta name="theme-color" content="#444" />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="OpenRouter Model Changes"
          href="/rss"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" sizes="32x32" />
        <link rel="stylesheet" href="/app.css" />
        <title>OpenRouter API Watcher</title>
      </head>
      <body f-client-nav>
        <Partial name="body">
          <Component />
        </Partial>
      </body>
    </html>
  );
}
