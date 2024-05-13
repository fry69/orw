// server.ts
import { OpenRouterModelWatcher, isDevelopment } from "./watch-or";
import path from "node:path";
import fs from "node:fs";
import { gzipSync } from "node:zlib";
import type {
  APIResponse,
  ChangesResponse,
  Model,
  ModelResponse,
  ModelsResponse,
  ResponseDataSig,
} from "./global";
import RSS from "rss";

export const createServer = (watcher: OpenRouterModelWatcher) => {
  const cacheDir = import.meta.env.WATCHOR_CACHE_DIR ?? path.join(".", "cache");
  const clientDistDir = import.meta.env.WATCHOR_CLIENT_PATH ?? path.join(".", "dist");
  const googleTokenFile = import.meta.env.WATCHOR_GOOGLE;

  // Create the cache directory if it doesn't exist
  if (!fs.existsSync(cacheDir)) {
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
    } catch (err) {
      console.error("Error creating cache directory:", err);
      throw err;
    }
  }

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

  const cacheAndServeContent = (
    fileName: string,
    contentGenerator: () => string,
    request: Request,
    dbOnlyCheck: boolean = false
  ): Response => {
    const cacheFilePath = path.join(cacheDir, fileName);

    // Check if the cached file does not exist or is older than the last API check
    // This is need to keep the client updated when the last check was
    // Optionally only check for last change in database, e.g. for RSS endpoint
    if (
      !fs.existsSync(cacheFilePath) ||
      fs.statSync(cacheFilePath).mtime.getTime() <
        (dbOnlyCheck ? watcher.getDBLastChange.getTime() : watcher.getAPILastCheck.getTime())
    ) {
      try {
        const gzipFilePath = `${cacheFilePath}.gz`;
        // Generate the content
        const content = contentGenerator();
        if (content) {
          // Cache the content
          fs.writeFileSync(cacheFilePath, content);
          // Compress the cached file
          const compressedData = gzipSync(content);
          fs.writeFileSync(gzipFilePath, compressedData);
        } else {
          throw "Content failed to generate";
        }
      } catch (err) {
        console.error(`Content file error: ${cacheFilePath}`, err);
        throw err;
      }
    }

    // Serve the cached file
    return serveStaticFile(cacheFilePath, request);
  };

  const serveStaticFile = (filePath: string, request: Request) => {
    const gzipFilePath = `${filePath}.gz`;

    // Check if the client accepts gzip compression
    const acceptsGzip = request.headers.get("Accept-Encoding")?.includes("gzip");

    if (fs.existsSync(filePath)) {
      // only check for compressed files if the original uncompressed file exists
      if (acceptsGzip && fs.existsSync(gzipFilePath)) {
        // Check if the uncompressed file is newer than the compressed file
        const uncompressedModTime = fs.statSync(filePath).mtime.getTime();
        const compressedModTime = fs.statSync(gzipFilePath).mtime.getTime();

        if (compressedModTime >= uncompressedModTime) {
          // only serve compressed files that are at least as new as the original

          // RSS needs a special content type
          if (gzipFilePath.endsWith("rss.xml.gz")) {
            return new Response(Bun.file(gzipFilePath), {
              headers: {
                "Content-Encoding": "gzip",
                "Content-Type": "application/rss+xml",
              },
            });
          }

          return new Response(Bun.file(gzipFilePath), {
            headers: {
              "Content-Encoding": "gzip",
              "Content-Type": Bun.file(filePath).type,
            },
          });
        }
        // fall through to serve uncompressed (or compressed by default) file
      }
      // RSS still needs a special content type
      if (filePath.endsWith("rss.xml")) {
        return new Response(Bun.file(filePath), {
          headers: {
            "Content-Type": "application/rss+xml",
          },
        });
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

  const generateRSSFeedXML = (): string => {
    const feed: RSS = new RSS({
      title: "OpenRouter Model Changes",
      description: "RSS feed for changes in OpenRouter models",
      feed_url: `${publicURL}rss`,
      site_url: publicURL,
      pubDate: watcher.getDBLastChange,
    });

    const changesRSS = watcher.loadChanges(50);

    const replaceDescription = (obj: any) => {
      for (const key in obj) {
        if (key === "description") {
          obj[key] = "[...]";
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          // Recursively traverse nested objects
          replaceDescription(obj[key]);
        }
      }
    };

    for (const change of changesRSS) {
      // Replace description field with [...] to not upset some RSS readers
      replaceDescription(change);
      feed.item({
        title: `Model ${change.id} ${change.type}`,
        description: `<code style="display: block; white-space: pre-wrap; font-family: monospace;">${JSON.stringify(
          change,
          null,
          2
        )}</code>`,
        url: `${publicURL}${change.type === "removed" ? "removed" : "model"}?id=${
          change.id
        }&timestamp=${change.timestamp.toISOString()}`,
        date: change.timestamp,
      });
    }

    return feed.xml();
  };

  const generateModels = (): string => {
    // Respond with complete model list
    const modelsResponse: ModelsResponse = apiRespone(watcher.getLastModelList);
    return JSON.stringify(modelsResponse);
  };

  const generateRemoved = (): string => {
    // Respond with removed model list
    const removedResponse: ModelsResponse = apiRespone(watcher.loadRemovedModelList());

    return JSON.stringify(removedResponse);
  };

  const generateModel = (id: string, model: Model): string => {
    // Respond with single model id and its associated changes
    const changes = watcher.loadChangesForModel(id, 50);
    const modelResponse: ModelResponse = apiRespone({
      model,
      changes,
    });
    return JSON.stringify(modelResponse);
  };

  const generateChanges = (): string => {
    // Respond with changes for all models
    const changes = watcher.loadChanges(100);
    const changesResponse: ChangesResponse = apiRespone({ changes });
    return JSON.stringify(changesResponse);
  };

  const server = Bun.serve({
    development: isDevelopment,
    port: import.meta.env.WATCHOR_PORT ?? 0,
    hostname: import.meta.env.WATCHOR_HOSTNAME ?? "0.0.0.0",

    fetch(request) {
      const url = new URL(request.url);
      switch (true) {
        case url.pathname === "/api/models":
          return cacheAndServeContent("models.json", generateModels, request);

        case url.pathname === "/api/removed":
          return cacheAndServeContent("removed.json", generateRemoved, request);

        case url.pathname === "/api/model":
          const id = url.searchParams.get("id");
          const model = watcher.getLastModelList.find((m) => m.id === id);
          if (id && model) {
            return cacheAndServeContent(
              `model-${btoa(id)}.json`,
              () => generateModel(id, model),
              request
            );
          }
          return error404("", "Model not found");

        case url.pathname === "/api/changes":
          return cacheAndServeContent("changes.json", generateChanges, request);

        case url.pathname === "/feed":
        case url.pathname === "/feed.xml":
        case url.pathname === "/feed/rss.xml":
        case url.pathname === "/rss":
        case url.pathname === "/rss.xml":
          return cacheAndServeContent("rss.xml", generateRSSFeedXML, request, true);

        case url.pathname === "/favicon.ico":
        case url.pathname === "/favicon.svg":
          return serveStaticFile("static/favicon.svg", request);

        case url.pathname === "/github.svg":
          return serveStaticFile("static/github-mark-white.svg", request);

        case url.pathname === "/rss.svg":
          return serveStaticFile("static/rss.svg", request);

        case url.pathname.startsWith("/google"):
          if (googleTokenFile && url.pathname === path.join("/", googleTokenFile)) {
            return serveStaticFile(path.join("static", googleTokenFile), request);
          }
          return error404(url.pathname);

        case url.pathname === "/screenshot.png":
          return serveStaticFile("screenshots/ChangeList_crop.png", request);

        case url.pathname === "/app.css":
          return serveStaticFile("static/app.css", request);

        case url.pathname === "/":
        case url.pathname === "/list":
        case url.pathname === "/removed":
        case url.pathname === "/changes":
        case url.pathname === "/model":
          // Serve the index.html file containing the React app
          return serveStaticFile(path.join(clientDistDir, "index.html"), request);

        case url.pathname.startsWith("/assets"):
          // Serve the React client application assets
          return serveStaticFile(path.join(clientDistDir, url.pathname.slice(1)), request);

        default:
          return error404(url.pathname);
      }
    },
  });

  const publicURL = import.meta.env.WATCHOR_URL ?? server.url.toString();
  watcher.log(`Webinterface running at URL ${publicURL}`);
};
