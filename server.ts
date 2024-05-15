// server.ts
import { OpenRouterAPIWatcher, isDevelopment } from "./orw";
import path from "node:path";
import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import type { APIResponse, Model, ResponseDataSig } from "./global";
import RSS from "rss";

/**
 * Creates a new server instance and starts watching the OpenRouter API.
 * @param {OpenRouterAPIWatcher} watcher - The OpenRouterAPIWatcher instance to use.
 * @returns {Promise<void>}
 */
export const createServer = async (watcher: OpenRouterAPIWatcher): Promise<void> => {
  const cacheDir = import.meta.env.ORW_CACHE_DIR ?? path.join(".", "cache");
  const clientDistDir = import.meta.env.ORW_CLIENT_PATH ?? path.join(".", "dist");
  const googleTokenFile = import.meta.env.ORW_GOOGLE;
  const disableCache = import.meta.env.ORW_DISABLE_CACHE;
  const contentSecurityPolicy = import.meta.env.ORW_CSP;

  if (disableCache) {
    console.log("Caching disabled");
  } else {
    // Create the cache directory if it doesn't exist
    if (!(await fs.promises.exists(cacheDir))) {
      try {
        await fs.promises.mkdir(cacheDir, { recursive: true });
      } catch (err) {
        console.error("Error creating cache directory:", err);
        throw err;
      }
    }
  }

  /**
   * Creates an API response object with status information.
   * @template T - The type of the response data.
   * @param {T} data - The response data.
   * @returns {APIResponse<T>} - The API response object.
   */
  const apiRespone = <T extends ResponseDataSig>(data: T): APIResponse<T> => ({
    status: {
      isDevelopment,
      apiLastCheck: watcher.getAPILastCheck.toISOString(),
      dbLastChange: watcher.getDBLastChange.toISOString(),
      dbModelCount: watcher.getDBModelCount,
      dbChangesCount: watcher.getDBChangesCount,
      dbRemovedModelCount: watcher.getDBRemovedModelCount,
      dbfirstChangeTimestamp: watcher.getDBFirstChangeTimestamp,
    },
    data: data,
  });

  /**
   * Creates a 404 error response.
   * @param {string} filePath - The file path that was not found.
   * @param {string} [message] - The error message.
   * @returns {Response} - The 404 error response.
   */
  const error404 = (filePath: string, message: string = "File not found"): Response => {
    console.log(`Error 404: ${filePath} ${message}`);
    return new Response(message, { status: 404 });
  };

  /**
   * Options for caching and compressing a file.
   * @interface cacheAndCompressFileOptions
   * @property {string} cacheFilePath - The path to the cached file.
   * @property {string} gzipFilePath - The path to the gzipped file.
   * @property {string} content - The content to be cached and compressed.
   */
  interface cacheAndCompressFileOptions {
    cacheFilePath: string;
    gzipFilePath: string;
    content: string;
  }

  /**
   * Caches and compresses a file.
   * @param {cacheAndCompressFileOptions} options - The options for caching and compressing the file.
   * @returns {Promise<void>}
   */
  const cacheAndCompressFile = async ({
    cacheFilePath,
    gzipFilePath,
    content,
  }: cacheAndCompressFileOptions): Promise<void> => {
    const cacheFile = fs.createWriteStream(cacheFilePath);
    const gzipFile = fs.createWriteStream(gzipFilePath);

    await pipeline(content, cacheFile);
    await pipeline(content, createGzip(), gzipFile);
  };

  /**
   * Checks if a file is fresh (i.e., its modification time is greater than or equal to the given last modified time).
   * @param {string} filePath - The path to the file.
   * @param {Date} lastModified - The last modified time to compare against.
   * @returns {Promise<boolean>} - True if the file is fresh, false otherwise.
   */
  const checkFileFreshness = async (filePath: string, lastModified: Date): Promise<boolean> => {
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

  /**
   * Calculates the remaining time in seconds until the next API check is due.
   * @returns {number} - The remaing time in seconds until the next API is due.
   */
  const secondsUntilAPIcheck = (): number => {
    const timeDiff = Date.now() - watcher.getAPILastCheck.getTime();
    const msRemaining = 3_600_000 - timeDiff;
    if (msRemaining > 0) {
      return Math.floor(msRemaining / 1000);
    }
    return 0;
  };

  /**
   * Generates the default value for Cache-Control based on time left until next API check.
   * @returns {string} - The value for Cache-Control based on time left until next API check.
   */
  const defaultCacheControl = (): string => {
    return "public, max-age=" + secondsUntilAPIcheck();
  };

  /**
   * Options for wrapper around Response()
   * @property {any} content - The content for the response
   * @property {string} [contentType] - The Content-Type for the response
   * @property {string} [cacheControl] - The Cache-Control for the response
   * @property {string} [contentEncoing] - The Content-Encoding for the response
   * @property {Request} request - The object containing the request
   */
  interface responseWrapperOptions {
    content: ArrayBuffer | string;
    contentType?: string;
    cacheControl?: string;
    contentEncoding?: string;
    request: Request;
  }

  /**
   * Wrapper around Response()
   * @param  {responseWrapperOptions} - The options for responseWrapper
   * @returns {Response} - The final response
   */
  const responseWrapper = ({
    content,
    contentType,
    cacheControl,
    contentEncoding,
    request,
  }: responseWrapperOptions): Response => {
    // Create response headers
    const headers: any = {};
    headers["Content-Type"] = contentType;
    if (contentSecurityPolicy) {
      headers["Content-Security-Policy"] = contentSecurityPolicy;
    }
    if (contentEncoding) {
      headers["Content-Encoding"] = contentEncoding;
    }
    if (!disableCache) {
      headers["Cache-Control"] = cacheControl ? cacheControl : defaultCacheControl();
    }
    if (request.method === "HEAD") {
      // HTTP HEAD method, this should never return a body, but include all headers
      // Content-Length gets overwritten by Response() to 0, if no body is present
      // X-Content-Length is a workaround to see the actual length of the resource
      let length = 0;
      if (typeof content === "string") {
        length = content.length ?? 0;
      } else {
        // assume content is an ArrayBuffer
        length = content.byteLength ?? 0;
      }
      headers["X-Content-Length"] = length;
      headers["Content-Length"] = length; // let's try anyway to see if it works sometime
    }
    return new Response(request.method === "HEAD" ? null : content, { headers: headers });
  };

  /**
   * Options for caching and serving content.
   * @interface cacheAndServeContentOptions
   * @property {string} fileName - The name of the file to cache.
   * @property {string} contentType - The content type of the file.
   * @property {string} [cacheControl] - The Cache-Control header for this resource.
   * @property {() => string} contentGenerator - A function that generates the content to be cached.
   * @property {boolean} [dbOnlyCheck] - Whether to check the database last change time instead of the API last check time.
   * @property {Request} request - The incoming request.
   */
  interface cacheAndServeContentOptions {
    fileName: string;
    contentType: string;
    cacheControl?: string;
    contentGenerator: () => string;
    dbOnlyCheck?: boolean;
    request: Request;
  }

  /**
   * Caches and serves content, using cached files if they are fresh.
   * @param {cacheAndServeContentOptions} options - The options for caching and serving the content.
   * @returns {Promise<Response>} - The response to be sent to the client.
   */
  const cacheAndServeContent = async ({
    fileName,
    contentType,
    cacheControl,
    contentGenerator,
    dbOnlyCheck = false,
    request,
  }: cacheAndServeContentOptions): Promise<Response> => {
    // Generate and serve content directly if caching is disabled
    if (disableCache) {
      const content = contentGenerator();
      return responseWrapper({ content, contentType, cacheControl, request });
    }

    const cacheFilePath = path.join(cacheDir, fileName);
    const gzipFilePath = `${cacheFilePath}.gz`;

    const lastModified = dbOnlyCheck ? watcher.getDBLastChange : watcher.getAPILastCheck;

    if (
      !(await checkFileFreshness(cacheFilePath, lastModified)) ||
      !(await checkFileFreshness(gzipFilePath, lastModified))
    ) {
      const content = contentGenerator();
      // create cache files in background while serving content direcly
      cacheAndCompressFile({ cacheFilePath, content, gzipFilePath });
      return responseWrapper({ content, contentType, cacheControl, request });
    }

    // Serve the cached file
    return serveStaticFile({ filePath: cacheFilePath, contentType, cacheControl, request });
  };

  /**
   * Options for serving a static file.
   * @interface serveStaticFileOptions
   * @property {string} filePath - The path to the file to serve.
   * @property {string} [contentType] - The content type of the file.
   * @property {string} [cacheControl] - The Cache-Control header for this resource.
   * @property {Request} request - The incoming request.
   */
  interface serveStaticFileOptions {
    filePath: string;
    contentType?: string;
    cacheControl?: string;
    request: Request;
  }

  /**
   * Serves a static file, optionally serving a gzipped version if the client accepts it.
   * @param {serveStaticFileOptions} options - The options for serving the static file.
   * @returns {Promise<Response>} - The response to be sent to the client.
   */
  const serveStaticFile = async ({
    filePath,
    contentType = Bun.file(filePath).type,
    cacheControl,
    request,
  }: serveStaticFileOptions): Promise<Response> => {
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
          return responseWrapper({
            content: await Bun.file(gzipFilePath).arrayBuffer(),
            contentType,
            cacheControl,
            contentEncoding: "gzip",
            request,
          });
        }
        // fall through to serve uncompressed (or compressed by default) file
      }
      return responseWrapper({
        content: await Bun.file(filePath).arrayBuffer(),
        contentType,
        cacheControl,
        request,
      });
    } else {
      return error404(filePath);
    }
  };

  /**
   * Generates an RSS feed XML string.
   * @returns {string} - The RSS feed XML.
   */
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

  /**
   * Generates a response object with the given content.
   * @template T - The type of the response data.
   * @param {T} content - The response data.
   * @returns {string} - The JSON-encoded response.
   */
  const generateResponse = (content: ResponseDataSig): string => {
    return JSON.stringify(apiRespone(content));
  };

  /**
   * Generates a model response object with the given model and changes.
   * @param {string} modelId - The ID of the model.
   * @param {Model} model - The model object.
   * @returns {string} - The JSON-encoded model response.
   */
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
          return cacheAndServeContent({
            fileName: "models.json",
            contentType: "application/json",
            contentGenerator: () => generateResponse(watcher.getLastModelList),
            request,
          });

        case url.pathname === "/api/removed":
          return cacheAndServeContent({
            fileName: "removed.json",
            contentType: "application/json",
            contentGenerator: () => generateResponse(watcher.loadRemovedModelList()),
            request,
          });

        case url.pathname === "/api/model":
          const id = url.searchParams.get("id");
          if (id && id.length < 256 && /^[a-zA-Z0-9\/\-]+$/.test(id)) {
            const model = watcher.getLastModelList.find((m) => m.id === id);
            if (model) {
              return cacheAndServeContent({
                fileName: `model-${btoa(id)}.json`,
                contentType: "application/json",
                contentGenerator: () => generateModelResponse(id, model),
                request,
              });
            }
          }
          return error404("", "Model not found");

        case url.pathname === "/api/changes":
          return cacheAndServeContent({
            fileName: "changes.json",
            contentType: "application/json",
            contentGenerator: () => generateResponse({ changes: watcher.loadChanges(100) }),
            request,
          });

        case url.pathname === "/rss":
          return cacheAndServeContent({
            fileName: "rss.xml",
            contentType: "application/rss+xml",
            contentGenerator: generateRSSFeedXML,
            dbOnlyCheck: true,
            request,
          });

        case url.pathname === "/robots.txt":
          return serveStaticFile({ filePath: "static/robots.txt", request });

        case url.pathname === "/favicon.ico":
        case url.pathname === "/favicon.svg":
          return serveStaticFile({ filePath: "static/favicon.svg", request });

        case url.pathname === "/github.svg":
          return serveStaticFile({ filePath: "static/github-mark-white.svg", request });

        case url.pathname === "/rss.svg":
          return serveStaticFile({ filePath: "static/rss.svg", request });

        case url.pathname.startsWith("/google"):
          if (googleTokenFile && url.pathname === path.join("/", googleTokenFile)) {
            return serveStaticFile({ filePath: path.join("static", googleTokenFile), request });
          }
          return error404(url.pathname);

        case url.pathname === "/sitemap.xml":
          return serveStaticFile({ filePath: "static/sitemap.xml", request });

        case url.pathname === "/screenshot.png":
          return serveStaticFile({ filePath: "screenshots/ChangeList_crop.png", request });

        case url.pathname === "/app.css":
          return serveStaticFile({ filePath: "static/app.css", request });

        case url.pathname === "/":
        case url.pathname === "/list":
        case url.pathname === "/removed":
        case url.pathname === "/changes":
        case url.pathname === "/model":
          // Serve the index.html file containing the React app
          return serveStaticFile({ filePath: path.join(clientDistDir, "index.html"), request });

        case url.pathname.startsWith("/assets"):
          // Serve the React client application assets
          return serveStaticFile({
            filePath: path.join(clientDistDir, url.pathname.slice(1)),
            request,
          });

        default:
          return error404(url.pathname);
      }
    },
  });

  const publicURL = import.meta.env.ORW_URL ?? server.url.toString();
  watcher.log(`Webinterface running at URL ${publicURL}`);
};
