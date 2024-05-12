// server.ts
import { OpenRouterModelWatcher, isDevelopment } from "./watch-or";
import path from "node:path";
import fs from "node:fs";
import { gzipSync } from "node:zlib";
import type {
  APIResponse,
  ChangesResponse,
  ModelResponse,
  ModelsResponse,
  ResponseDataSig,
} from "./global";
import RSS from "rss";

export const createServer = (watcher: OpenRouterModelWatcher) => {
  const cacheDir = import.meta.env.WATCHOR_CACHE_DIR ?? path.join(".", "cache");
  const clientDistDir =
    import.meta.env.WATCHOR_CLIENT_PATH ?? path.join(".", "dist");
  const googleTokenFile = import.meta.env.WATCHOR_GOOGLE;

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

  const error404 = (filePath: string, message = "File not found") => {
    console.log(`Error 404: ${filePath} ${message}`);
    return new Response(message, { status: 404 });
  };

  const serveStaticFile = (filePath: string, request: Request) => {
    const gzipFilePath = `${filePath}.gz`;

    // Check if the client accepts gzip compression
    const acceptsGzip = request.headers
      .get("Accept-Encoding")
      ?.includes("gzip");

    if (fs.existsSync(filePath)) {
      // only check for compressed files if the original uncompressed file exists
      if (acceptsGzip && fs.existsSync(gzipFilePath)) {
        // Check if the uncompressed file is newer than the compressed file
        const uncompressedModTime = fs.statSync(filePath).mtime.getTime();
        const compressedModTime = fs.statSync(gzipFilePath).mtime.getTime();

        if (compressedModTime >= uncompressedModTime) {
          // only serve compressed files that are at least as new as the original
          return new Response(Bun.file(gzipFilePath), {
            headers: {
              "Content-Encoding": "gzip",
              "Content-Type": Bun.file(filePath).type
            },
          });
        }
        // fall through to serve uncompressed file
      }
      return new Response(Bun.file(filePath));
    } else {
      return error404(filePath);
    }
  };

  const compressFile = (inputPath: string, outputPath: string) => {
    try {
      const inputData = fs.readFileSync(inputPath);
      const compressedData = gzipSync(inputData);
      fs.writeFileSync(outputPath, compressedData);
    } catch (err) {
      console.error("Error compressing file:", err);
      throw err;
    }
  };

  const rssFilePath = path.join(cacheDir, "rss.xml");
  const rssGzipFilePath = `${rssFilePath}.gz`;

  const generateRSSFeed = (): RSS => {
    const feed: RSS = new RSS({
      title: "OpenRouter Model Changes",
      description: "RSS feed for changes in OpenRouter models",
      feed_url: `${publicURL}rss`,
      site_url: publicURL,
      pubDate: watcher.getDBLastChange,
    });

    const changesRSS = watcher.loadChanges(50);
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

    return feed;
  };

  const serveRSSFeed = (request: Request): Response => {
    // Check if the cached RSS file is up-to-date
    const cachedRSSModTime = fs.existsSync(rssFilePath)
      ? fs.statSync(rssFilePath).mtime.getTime()
      : 0;
    const dbLastChange = watcher.getDBLastChange.getTime();

    if (cachedRSSModTime < dbLastChange) {
      try {
        // Check if the cache directory exists, and create it if not
        if (!fs.existsSync(cacheDir)) {
          try {
            console.log("Create cache directory");
            fs.mkdirSync(cacheDir, { recursive: true });
          } catch (err) {
            console.error("Error creating cache directory:", err);
            throw err;
          }
        }

        // Generate a new RSS feed and cache it
        console.log("Generating fresh rss.xml");
        const feed = generateRSSFeed();
        fs.writeFileSync(rssFilePath, feed.xml());

        // Compress the cached RSS file
        compressFile(rssFilePath, rssGzipFilePath);
      } catch (err) {
        console.error("Error generating or caching RSS feed:", err);
        return error404(rssFilePath, "Error generating RSS feed");
      }
    }
    // Serve the cached RSS file
    return serveStaticFile(rssFilePath, request);
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
          return serveRSSFeed(request);

        case url.pathname === "/favicon.ico":
        case url.pathname === "/favicon.svg":
          return serveStaticFile("static/favicon.svg", request);

        case url.pathname === "/github.svg":
          return serveStaticFile("static/github-mark-white.svg", request);

        case url.pathname.startsWith("/google"):
          if (
            googleTokenFile &&
            url.pathname === path.join("/", googleTokenFile)
          ) {
            return serveStaticFile(
              path.join("static", googleTokenFile),
              request
            );
          }
          return error404(url.pathname);

        case url.pathname === "/app.css":
          return serveStaticFile("static/app.css", request);

        case url.pathname === "/":
        case url.pathname === "/list":
        case url.pathname === "/removed":
        case url.pathname === "/changes":
        case url.pathname === "/model":
          // Serve the index.html file containing the React app
          return serveStaticFile(
            path.join(clientDistDir, "index.html"),
            request
          );

        case url.pathname.startsWith("/assets"):
          // Serve the React client application assets
          return serveStaticFile(
            path.join(clientDistDir, url.pathname.slice(1)),
            request
          );

        default:
          return error404(url.pathname);
      }
    },
  });

  const publicURL = import.meta.env.WATCHOR_URL ?? server.url.toString();
  watcher.log(`Webinterface running at URL ${publicURL}`);
};
