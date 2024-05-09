// server.ts
import { OpenRouterModelWatcher } from "./watch-or";
import path from "node:path";
import fs from "node:fs";
import type { ChangesResponse, ModelResponse, ModelsResponse } from "./types";
import RSS from "rss";

export const createServer = (watcher: OpenRouterModelWatcher) => {
  const clientDistDir =
    import.meta.env.WATCHOR_CLIENT_PATH ?? path.join(".", "dist");

  const server = Bun.serve({
    port: import.meta.env.WATCHOR_PORT ?? 0,
    hostname: import.meta.env.WATCHOR_HOSTNAME ?? "0.0.0.0",
    fetch(request) {
      const url = new URL(request.url);
      switch (url.pathname) {
        case "/api/models":
          const modelsResponse: ModelsResponse = {
            apiLastCheck: watcher.getAPILastCheck,
            dbLastChange: watcher.getDBLastChange,
            data: watcher.getLastModelList,
          };

          return new Response(JSON.stringify(modelsResponse), {
            headers: { "Content-Type": "application/json" },
          });

        case "/api/model":
          const id = url.searchParams.get("id");
          if (id) {
            const model = watcher.getLastModelList.find((m) => m.id === id);
            if (!model) {
              return new Response("Model not found", { status: 404 });
            }
            const changes = watcher.loadChangesForModel(id, 50);
            const modelResponse: ModelResponse = {
              apiLastCheck: watcher.getAPILastCheck,
              dbLastChange: watcher.getDBLastChange,
              data: {
                model,
                changes,
              },
            };

            return new Response(JSON.stringify(modelResponse), {
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response("Model not found", { status: 404 });

        case "/api/changes":
          const changes = watcher.loadChanges(100);
          const changesResponse: ChangesResponse = {
            apiLastCheck: watcher.getAPILastCheck,
            dbLastChange: watcher.getDBLastChange,
            data: {
              changes,
            },
          };

          return new Response(JSON.stringify(changesResponse), {
            headers: { "Content-Type": "application/json" },
          });

        case "/rss":
          const feed: RSS = new RSS({
            title: "OpenRouter Model Changes",
            description: "RSS feed for changes in OpenRouter models",
            feed_url: `${publicURL}rss`,
            site_url: publicURL,
            pubDate: watcher.getDBLastChange,
          });

          const changesRSS = watcher.loadChanges(100);
          for (const change of changesRSS) {
            feed.item({
              title: `Model ${change.id} ${change.type}`,
              description: `<code style="display: block; white-space: pre-wrap; font-family: monospace;">${JSON.stringify(change, null, 2)}</code>`,
              url: `${publicURL}model?id=${
                change.id
              }&timestamp=${change.timestamp.toISOString()}`,
              date: change.timestamp,
            });
          }

          return new Response(feed.xml(), {
            headers: { "Content-Type": "application/rss+xml" },
          });
        default:
          // Serve the React client application assets
          const filePath = path.join(clientDistDir, url.pathname.slice(1));
          if (fs.existsSync(filePath) && !(filePath === "dist")) {
            return new Response(Bun.file(filePath));
          } else {
            // Serve the index.html file for any other routes
            return new Response(
              Bun.file(path.join(clientDistDir, "index.html"))
            );
          }
      }
    },
  });

  const publicURL = import.meta.env.WATCHOR_URL ?? server.url.toString();
  watcher.log(`Webinterface running at URL ${publicURL}`);
};
