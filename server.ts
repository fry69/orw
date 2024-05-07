// server.ts
import { OpenRouterModelWatcher } from "./watch-or";
import path from "node:path";
import fs from "node:fs";

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
          return new Response(JSON.stringify(watcher.loadLastModelList()), {
            headers: { "Content-Type": "application/json" },
          });
        case "/api/model":
          const id = url.searchParams.get("id");
          if (id) {
            const model = watcher.loadLastModelList().find((m) => m.id === id);
            const changes = watcher.loadChanges(10).filter((c) => c.id === id);
            return new Response(JSON.stringify({ model, changes }), {
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response("Model not found", { status: 404 });
        case "/api/changes":
          const changes = watcher.loadChanges(10);
          return new Response(JSON.stringify(changes), {
            headers: { "Content-Type": "application/json" },
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

  watcher.log(`Webinterface running at URL ${server.url}`);
};
