// server.ts
import { OpenRouterAPIWatcher, isDevelopment } from "./orw";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { APIVersion } from "./version";
import type { APIResponse, ServerStatus } from "./global";
import RSS from "rss";

/**
 * Creates a new server instance to serve the web client and changes as an RSS feed.
 * @param {OpenRouterAPIWatcher} watcher - The OpenRouterAPIWatcher instance to use.
 * @returns {Promise<void>}
 */
export const createServer = async (watcher: OpenRouterAPIWatcher): Promise<void> => {
  const cacheDir = import.meta.env.ORW_CACHE_DIR ?? path.join(".", "cache");
  const clientDir = import.meta.env.ORW_CLIENT_DIR ?? path.join(".", "dist");
  const disableCache = import.meta.env.ORW_DISABLE_CACHE;
  const contentSecurityPolicy = import.meta.env.ORW_CSP;
  const port = import.meta.env.ORW_PORT ?? 0;
  const hostname = import.meta.env.ORW_HOSTNAME ?? "0.0.0.0";

  // Read all filenames in the static directory, make sure they are real files, including subdirs
  const staticFiles: string[] = [];
  fs.readdirSync(clientDir, { recursive: true }).forEach((fileName) => {
    if (typeof fileName === "string") {
      const filePath = path.join(clientDir, fileName);
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        staticFiles.push(fileName);
      }
    }
  });

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
   * Calculates the Etag for a file.
   * @param {string} filePath - The path to the file.
   * @returns {Promise<string>} - The Etag for the file.
   */
  const calculateEtag = async (filePath: string): Promise<string> => {
    const stats = await fs.promises.stat(filePath);
    const content = await fs.promises.readFile(filePath);
    const hash = crypto.createHash("sha256");
    hash.update(content);
    hash.update(stats.mtime.toISOString());
    return `"${hash.digest("hex")}"`;
  };

  /**
   * Retrieves the last modified timestamp for a file.
   * @param {string} filePath - The path to the file.
   * @returns {Promise<Date>} - The last modified timestamp of the file.
   */
  const getLastModifiedTimestamp = async (filePath: string): Promise<Date> => {
    try {
      const stats = await fs.promises.stat(filePath);
      return stats.mtime;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return new Date(0);
      }
      throw error;
    }
  };

  /**
   * Options for caching and compressing a file.
   * @interface cacheAndCompressFileOptions
   * @property {string} cacheFilePath - The path to the cached file.
   * @property {string} gzipFilePath - The path to the gzipped file.
   * @property {Promise<string>} content - The content to be cached and compressed.
   */
  interface cacheAndCompressFileOptions {
    cacheFilePath: string;
    gzipFilePath: string;
    content: Promise<string>;
  }

  /**
   * Caches and compresses a file.
   * @param {cacheAndCompressFileOptions} options - The options for caching and compressing the file.
   * @returns {Promise<string>} - The calculated Etag for the file.
   */
  const cacheAndCompressFile = async ({
    cacheFilePath,
    gzipFilePath,
    content,
  }: cacheAndCompressFileOptions): Promise<string> => {
    // This async function runs in the background, so it can be raced.
    // Work around this problem by creating temporary files and check for their existence.

    const cacheFilePathTmp = cacheFilePath + ".tmp";
    const gzipFilePathTmp = gzipFilePath + ".tmp";
    const etagFilePath = cacheFilePath + ".etag";
    const etagFilePathTmp = etagFilePath + ".tmp";

    // Don't race me!
    if (
      (await Bun.file(cacheFilePathTmp).exists()) ||
      (await Bun.file(gzipFilePathTmp).exists()) ||
      (await Bun.file(etagFilePathTmp).exists())
    ) {
      // Another process called this function while a different
      // cacheAndCompressFile process is already running.
      // Ignore this attempt and return seems fine.
      return "";
    }

    const cacheFileHandle = fs.createWriteStream(cacheFilePathTmp);
    const gzipFileHandle = fs.createWriteStream(gzipFilePathTmp);
    const realContent = await content;

    await pipeline(realContent, cacheFileHandle);
    await pipeline(realContent, createGzip(), gzipFileHandle);
    const etag = await calculateEtag(cacheFilePathTmp);
    await fs.promises.writeFile(etagFilePathTmp, etag);

    // Rename the temporary files to their final destinations,
    // this should be almost atomic.
    await fs.promises.rename(cacheFilePathTmp, cacheFilePath);
    await fs.promises.rename(gzipFilePathTmp, gzipFilePath);
    await fs.promises.rename(etagFilePathTmp, etagFilePath);

    return etag;
  };

  /**
   * Checks if a file is fresh (i.e., its modification time is greater than
   * or equal to the given last modified time).
   * @param {string} filePath - The path to the file.
   * @param {Date} lastModified - The last modified time to compare against.
   * @returns {Promise<boolean>} - True if the file is fresh, false otherwise.
   */
  const checkFileFreshness = async (filePath: string, lastModified: Date): Promise<boolean> => {
    return (await getLastModifiedTimestamp(filePath)) >= lastModified;
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
   * @property {ArrayBuffer | Promise<string>} content - The content for the response
   * @property {string} [contentType] - The Content-Type for the response
   * @property {string} [contentDisposistion] - The Content-Disposistion for the response
   * @property {string} [cacheControl] - The Cache-Control for the response
   * @property {string} [contentEncoing] - The Content-Encoding for the response
   * @property {string} [etag] - The Etag for the response
   * @property {Date} [lastModified] - The Last-Modified timestamp for the response
   * @property {Request} request - The object containing the request
   */
  interface responseWrapperOptions {
    content: ArrayBuffer | Promise<string>;
    contentType: string;
    contentDisposistion?: string;
    cacheControl?: string;
    contentEncoding?: string;
    etag?: string;
    lastModified?: Date;
    expires?: Date;
    request: Request;
  }

  /**
   * Wrapper around Response()
   * @param  {responseWrapperOptions} - The options for responseWrapper
   * @returns {Promise<Response>} - The final response
   */
  const responseWrapper = async ({
    content,
    contentType,
    contentDisposistion,
    cacheControl,
    contentEncoding,
    etag,
    lastModified,
    expires,
    request,
  }: responseWrapperOptions): Promise<Response> => {
    // Create response headers
    const headers: any = {};
    headers["Content-Type"] = contentType;
    if (contentDisposistion) {
      headers["Content-Disposistion"] = contentDisposistion;
    }
    if (contentSecurityPolicy) {
      headers["Content-Security-Policy"] = contentSecurityPolicy;
    }
    if (contentEncoding) {
      headers["Content-Encoding"] = contentEncoding;
    }
    if (!disableCache) {
      headers["Cache-Control"] = cacheControl ? cacheControl : defaultCacheControl();
    }
    if (etag && etag !== "") {
      headers["Etag"] = etag;
    }
    if (lastModified) {
      headers["Last-Modified"] = lastModified.toUTCString();
    }
    let expiresDate = new Date(0);
    if (expires) {
      expiresDate = expires;
    } else {
      expiresDate = new Date(new Date().getTime() + secondsUntilAPIcheck() * 1_000);
    }
    headers["Expires"] = expiresDate.toUTCString();

    const realContent = await content;
    if (request.method === "HEAD") {
      // HTTP HEAD method, this should never return a body, but include all headers
      // Content-Length gets overwritten by Response() to 0, if no body is present
      // X-Content-Length is a workaround to see the actual length of the resource
      let length = 0;
      if (typeof realContent === "string") {
        length = realContent.length ?? 0;
      } else {
        // assume content is an ArrayBuffer
        length = realContent.byteLength ?? 0;
      }
      headers["X-Content-Length"] = length;
      headers["Content-Length"] = length; // let's try anyway to see if it works sometime
    }
    return new Response(request.method === "HEAD" ? null : realContent, { headers: headers });
  };

  /**
   * Options for caching and serving content.
   * @interface cacheAndServeContentOptions
   * @property {string} fileName - The name of the file to cache.
   * @property {string} contentType - The content type of the file.
   * @property {string} [cacheControl] - The Cache-Control header for this resource.
   * @property {() => Promise<string>} contentGenerator - A function that generates the content to be cached.
   * @property {boolean} [dbOnlyCheck] - Whether to check the database last change time instead of the API last check time.
   * @property {Request} request - The incoming request.
   */
  interface cacheAndServeContentOptions {
    fileName: string;
    contentType: string;
    cacheControl?: string;
    contentGenerator: () => Promise<string>;
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
    const etagFilePath = `${cacheFilePath}.etag`;

    const lastModified = dbOnlyCheck ? watcher.getDBLastChange : watcher.getAPILastCheck;

    if (
      !(await checkFileFreshness(cacheFilePath, lastModified)) ||
      !(await checkFileFreshness(gzipFilePath, lastModified)) ||
      !(await fs.promises.exists(etagFilePath))
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
   * @property {string} [contentDisposistion] - The content disposistion if served as a file to download.
   * @property {string} [cacheControl] - The Cache-Control header for this resource.
   * @property {Promise<Request>} request - The incoming request.
   */
  interface serveStaticFileOptions {
    filePath: string;
    contentType?: string;
    contentDisposistion?: string;
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
    contentDisposistion,
    cacheControl,
    request,
  }: serveStaticFileOptions): Promise<Response> => {
    const lastModified = await getLastModifiedTimestamp(filePath);
    const gzipFilePath = filePath.endsWith(".gz") ? filePath : `${filePath}.gz`;
    const etagFilePath = `${filePath}.etag`;
    let etag = "";

    // Get the Etag for the file if it exists
    if (await Bun.file(etagFilePath).exists()) {
      etag = await fs.promises.readFile(etagFilePath, "utf8");
    }

    // Check if the client has a cached version of the file
    const clientEtag = request.headers.get("If-None-Match");
    if (clientEtag && clientEtag === etag) {
      return new Response(null, { status: 304 });
    }

    // Check if the client has a cached version of the file
    const clientLastModified = request.headers.get("If-Modified-Since");
    if (clientLastModified) {
      const clientModifiedDate = new Date(clientLastModified);
      // Account for potential small differences in timestamps
      const timeDiff = Math.abs(lastModified.getTime() - clientModifiedDate.getTime());
      if (timeDiff <= 1000) {
        return new Response(null, { status: 304 });
      }
    }

    // Check if the client accepts gzip compression
    const acceptsGzip = request.headers.get("Accept-Encoding")?.includes("gzip");

    if (await Bun.file(filePath).exists()) {
      // only check for compressed files if the original uncompressed file exists
      if (acceptsGzip && (await Bun.file(gzipFilePath).exists())) {
        const uncompressedModTime = (await getLastModifiedTimestamp(filePath)).getTime();
        const compressedModTime = (await getLastModifiedTimestamp(gzipFilePath)).getTime();

        // only serve compressed files that are at least as new as the original
        if (compressedModTime >= uncompressedModTime) {
          return responseWrapper({
            content: await Bun.file(gzipFilePath).arrayBuffer(),
            contentType,
            contentDisposistion,
            cacheControl,
            contentEncoding: "gzip",
            etag,
            lastModified,
            request,
          });
        }
        // fall through to serve uncompressed (or compressed by default) file
      }
      return responseWrapper({
        content: await Bun.file(filePath).arrayBuffer(),
        contentType,
        contentDisposistion,
        cacheControl,
        etag,
        lastModified,
        request,
      });
    } else {
      return error404(filePath);
    }
  };

  /**
   * Generates an RSS feed XML string.
   * @returns {Promise<string>} - The RSS feed XML.
   */
  const generateRSSFeedXML = async (): Promise<string> => {
    const feed: RSS = new RSS({
      title: "OpenRouter Model Changes",
      description: "RSS feed for detected changes in the OpenRouter model list",
      feed_url: publicURL + "rss",
      site_url: publicURL,
      image_url: publicURL + "favicon.svg",
      docs: "https://github.com/fry69/orw",
      language: "en",
      ttl: 60,
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
        url: `${publicURL}model?id=${change.id}&timestamp=${change.timestamp.toISOString()}`,
        date: change.timestamp,
      });
    }

    return feed.xml();
  };

  const server = Bun.serve({
    development: isDevelopment,
    port,
    hostname,

    fetch(request) {
      const url = new URL(request.url);

      // Serve all files found in the client directory from the root
      if (staticFiles.includes(url.pathname.slice(1))) {
        return serveStaticFile({ filePath: path.join(clientDir, url.pathname), request });
      }

      const statusRepsone = (): ServerStatus => ({
        isValid: true,
        isDevelopment,
        apiLastCheck: watcher.getAPILastCheck.toISOString(),
        apiLastCheckStatus: watcher.getAPILastCheckStatus,
        dbLastChange: watcher.getDBLastChange.toISOString(),
      });

      // All other endpoints require special handling
      switch (url.pathname) {
        case "/api/data":
          return cacheAndServeContent({
            fileName: "data.json",
            contentType: "application/json",
            contentGenerator: async (): Promise<string> => {
              const response: APIResponse = {
                version: APIVersion,
                data: {
                  models: watcher.getModelList,
                  removed: watcher.getRemovedModelList,
                  changes: watcher.getChangesList,
                },
              };
              return JSON.stringify(response);
            },
            dbOnlyCheck: true,
            request,
          });

        case "/api/status":
          return cacheAndServeContent({
            fileName: "status.json",
            contentType: "application/json",
            contentGenerator: async (): Promise<string> => {
              const response: APIResponse = {
                version: APIVersion,
                status: statusRepsone(),
              };
              return JSON.stringify(response);
            },
            request,
          });

        case "/rss":
          return cacheAndServeContent({
            fileName: "rss.xml",
            contentType: "application/rss+xml",
            contentGenerator: generateRSSFeedXML,
            dbOnlyCheck: true,
            request,
          });

        case "/":
        case "/list":
        case "/removed":
        case "/changes":
        case "/model":
          // Serve the index.html file containing the React app
          return serveStaticFile({ filePath: path.join(clientDir, "index.html"), request });

        case "/orw.db.gz":
          // Serve database backup file for bootstrapping other installations
          return serveStaticFile({
            filePath: watcher.getDbBackupPath + ".gz",
            contentDisposistion: 'attachment; filename="orw.db.gz"',
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
