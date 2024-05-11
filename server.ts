// server.ts
import { OpenRouterModelWatcher, isDevelopment } from "./watch-or";
import path from "node:path";
import fs from "node:fs";
import type {
  APIResponse,
  ChangesResponse,
  ModelResponse,
  ModelsResponse,
  ResponseDataSig,
} from "./types";
import RSS from "rss";

export const createServer = (watcher: OpenRouterModelWatcher) => {
  const clientDistDir =
    import.meta.env.WATCHOR_CLIENT_PATH ?? path.join(".", "dist");

  const apiRespone = <T extends ResponseDataSig>(data: T): APIResponse<T> => ({
    status: {
      isDevelopment,
      apiLastCheck: watcher.getAPILastCheck.toISOString(),
      dbLastChange: watcher.getDBLastChange.toISOString(),
      dbModelCount: watcher.getDBModelCount,
      dbChangesCount: watcher.getDBChangesCount,
      dbRemovedModelCount: watcher.getDBRemovedModelCount,
    },
    data: data,
  });

  const serveSVG = (svgFile: string) => {
    const filePath = path.join("static", svgFile);
    if (fs.existsSync(filePath)) {
      return new Response(Bun.file(filePath), {
        headers: {
          "Content-Type": "image/svg+xml",
        },
      });
    } else {
      return new Response("File not found", { status: 404 });
    }
  };

  const server = Bun.serve({
    development: isDevelopment,
    port: import.meta.env.WATCHOR_PORT ?? 0,
    hostname: import.meta.env.WATCHOR_HOSTNAME ?? "0.0.0.0",
    fetch(request) {
      const url = new URL(request.url);
      switch (true) {
        case url.pathname === "/api/models":
          // Respond with complete model list
          const modelsResponse: ModelsResponse = apiRespone(
            watcher.getLastModelList
          );

          return new Response(JSON.stringify(modelsResponse), {
            headers: { "Content-Type": "application/json" },
          });

        case url.pathname === "/api/removed":
          // Respond with removed model list
          const removedResponse: ModelsResponse = apiRespone(
            watcher.loadRemovedModelList()
          );

          return new Response(JSON.stringify(removedResponse), {
            headers: { "Content-Type": "application/json" },
          });

        case url.pathname === "/api/model":
          // Respond with single model id and its associated changes
          const id = url.searchParams.get("id");
          if (id) {
            const model = watcher.getLastModelList.find((m) => m.id === id);
            if (!model) {
              return new Response("Model not found", { status: 404 });
            }
            const changes = watcher.loadChangesForModel(id, 50);
            const modelResponse: ModelResponse = apiRespone({
              model,
              changes,
            });
            return new Response(JSON.stringify(modelResponse), {
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response("Model not found", { status: 404 });

        case url.pathname === "/api/changes":
          // Respond with changes for all models
          const changes = watcher.loadChanges(100);
          const changesResponse: ChangesResponse = apiRespone({ changes });
          return new Response(JSON.stringify(changesResponse), {
            headers: { "Content-Type": "application/json" },
          });

        case url.pathname === "/rss":
          // Generate an RSS feed containing changes for all models
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
              description: `<code style="display: block; white-space: pre-wrap; font-family: monospace;">${JSON.stringify(
                change,
                null,
                2
              )}</code>`,
              url: `${publicURL}model?id=${
                change.id
              }&timestamp=${change.timestamp.toISOString()}`,
              date: change.timestamp,
            });
          }

          return new Response(feed.xml(), {
            headers: { "Content-Type": "application/rss+xml" },
          });

        case url.pathname === "/favicon.ico":
        case url.pathname === "/favicon.svg":
          return serveSVG("favicon.svg");

        case url.pathname === "/github.svg":
          return serveSVG("github-mark-white.svg");

        case url.pathname === "/":
        case url.pathname === "/list":
        case url.pathname === "/removed":
        case url.pathname === "/changes":
        case url.pathname === "/model":
          // Serve the index.html file containing the React app
          return new Response(Bun.file(path.join(clientDistDir, "index.html")));

        case url.pathname.startsWith("/assets"):
          // Serve the React client application assets
          const filePath = path.join(clientDistDir, url.pathname.slice(1));
          if (fs.existsSync(filePath)) {
            return new Response(Bun.file(filePath));
          }
          return new Response("File not found", { status: 404 });

        default:
          return new Response("File not found", { status: 404 });
      }
    },
  });

  const publicURL = import.meta.env.WATCHOR_URL ?? server.url.toString();
  watcher.log(`Webinterface running at URL ${publicURL}`);
};
