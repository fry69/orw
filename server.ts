// server.ts
import { OpenRouterAPIWatcher, isDevelopment } from "./orw";
import path from "node:path";
import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import type { APIResponse, Model, ResponseDataSig } from "./global";
import RSS from "rss";

export const createServer = async (watcher: OpenRouterAPIWatcher) => {
  const cacheDir = import.meta.env.ORW_CACHE_DIR ?? path.join(".", "cache");
  const clientDistDir = import.meta.env.ORW_CLIENT_PATH ?? path.join(".", "dist");
  const googleTokenFile = import.meta.env.ORW_GOOGLE;

  // Create the cache directory if it doesn't exist
  if (!(await fs.promises.exists(cacheDir))) {
    try {
      await fs.promises.mkdir(cacheDir, { recursive: true });
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

  const cacheAndCompressFile = async (
    cacheFilePath: string,
    content: string,
    gzipFilePath: string
  ) => {
    const cacheFile = fs.createWriteStream(cacheFilePath);
    const gzipFile = fs.createWriteStream(gzipFilePath);

    await pipeline(content, cacheFile);
    await pipeline(content, createGzip(), gzipFile);
  };

  const checkFileFreshness = async (filePath: string, lastModified: Date) => {
    try {
      const stats = await fs.promises.stat(filePath);
      return stats.mtime >= lastModified;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return false;
      }
      throw error;
    }
  };

  const cacheAndServeContent = async (
    fileName: string,
    contentType: string,
    contentGenerator: () => string,
    request: Request,
    dbOnlyCheck: boolean = false
  ): Promise<Response> => {
    const cacheFilePath = path.join(cacheDir, fileName);
    const cacheFilePathGz = `${cacheFilePath}.gz`;

    const lastModified = dbOnlyCheck ? watcher.getDBLastChange : watcher.getAPILastCheck;

    if (
      !(await checkFileFreshness(cacheFilePath, lastModified)) ||
      !(await checkFileFreshness(cacheFilePathGz, lastModified))
    ) {
      const content = contentGenerator();
      // create cache files in background while serving content direcly
      cacheAndCompressFile(cacheFilePath, content, cacheFilePathGz);
      return new Response(content, {
        headers: {
          "content-type": contentType,
        },
      });
    }

    // Serve the cached file
    return serveStaticFile(cacheFilePath, request, contentType);
  };

  const serveStaticFile = async (filePath: string, request: Request, contentType?: string) => {
    const gzipFilePath = `${filePath}.gz`;

    // Check if the client accepts gzip compression
    const acceptsGzip = request.headers.get("Accept-Encoding")?.includes("gzip");

    if (await Bun.file(filePath).exists()) {
      // only check for compressed files if the original uncompressed file exists
      if (acceptsGzip && (await Bun.file(gzipFilePath).exists())) {
        const uncompressedModTime = (await fs.promises.stat(filePath)).mtime.getTime();
        const compressedModTime = (await fs.promises.stat(gzipFilePath)).mtime.getTime();

        // only serve compressed files that are at least as new as the original
        if (compressedModTime >= uncompressedModTime) {
          return new Response(await Bun.file(gzipFilePath).arrayBuffer(), {
            headers: {
              "Content-Encoding": "gzip",
              "Content-Type": contentType ? contentType : Bun.file(filePath).type,
            },
          });
        }
        // fall through to serve uncompressed (or compressed by default) file
      }
      return new Response(await Bun.file(filePath).arrayBuffer(), {
        headers: {
          "Content-Type": contentType ? contentType : Bun.file(filePath).type,
        },
      });
    } else {
      return error404(filePath);
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

  const generateResponse = (content: ResponseDataSig): string => {
    return JSON.stringify(apiRespone(content));
  };

  const generateModelResponse = (modelId: string, model: Model): string => {
    const changes = watcher.loadChangesForModel(modelId, 50);
    return generateResponse({ model, changes });
  };

  const server = Bun.serve({
    development: isDevelopment,
    port: import.meta.env.ORW_PORT ?? 0,
    hostname: import.meta.env.ORW_HOSTNAME ?? "0.0.0.0",

    fetch(request) {
      const url = new URL(request.url);
      switch (true) {
        case url.pathname === "/api/models":
          return cacheAndServeContent(
            "models.json",
            "application/json",
            () => generateResponse(watcher.getLastModelList),
            request
          );

        case url.pathname === "/api/removed":
          return cacheAndServeContent(
            "removed.json",
            "application/json",
            () => generateResponse(watcher.loadRemovedModelList()),
            request
          );

        case url.pathname === "/api/model":
          const id = url.searchParams.get("id");
          if (id && id.length < 256 && /^[a-zA-Z0-9\/\-]+$/.test(id)) {
            const model = watcher.getLastModelList.find((m) => m.id === id);
            if (model) {
              return cacheAndServeContent(
                `model-${btoa(id)}.json`,
                "application/json",
                () => generateModelResponse(id, model),
                request
              );
            }
          }
          return error404("", "Model not found");

        case url.pathname === "/api/changes":
          return cacheAndServeContent(
            "changes.json",
            "application/json",
            () => generateResponse({ changes: watcher.loadChanges(100) }),
            request
          );

        case url.pathname === "/rss":
          return cacheAndServeContent(
            "rss.xml",
            "application/rss+xml",
            generateRSSFeedXML,
            request,
            true
          );

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

  const publicURL = import.meta.env.ORW_URL ?? server.url.toString();
  watcher.log(`Webinterface running at URL ${publicURL}`);
};
