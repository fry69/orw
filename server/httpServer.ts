// httpServer.ts
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import process from "node:process";
import http, { type IncomingMessage, type ServerResponse } from "http";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";

import mime from "mime-types";
import RSS from "rss";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { OpenRouterAPIWatcher, isDevelopment } from "./watcher.js";
import { API__LISTS, API__STATUS, API_VERSION } from "../shared/constants.js";
import type { APIResponse, APIStatus } from "../shared/global";
import { ChangeSnippet } from "../src/ChangeSnippet.js";

const dataDir = process.env.ORW_DATA_PATH || "./data";
const port = parseInt(process.env.ORW_PORT ?? "0");
const hostname = process.env.ORW_HOSTNAME ?? "0.0.0.0";
const defaultConfig = {
  dataDir,
  port,
  hostname,
  cacheDir: process.env.ORW_CACHE_DIR ?? path.join(dataDir, "cache"),
  clientDir: process.env.ORW_CLIENT_DIR ?? path.join(".", "dist"),
  disableCache: process.env.ORW_DISABLE_CACHE ? true : false,
  contentSecurityPolicy: process.env.ORW_CSP,
  publicURL: process.env.ORW_URL ?? `http://${hostname}:${port}`,
};

/**
 * Options for caching and compressing a file.
 */
export interface cacheAndCompressFileOptions {
  /** he path to the cached file. */
  cacheFilePath: string;
  /** The path to the gzipped file. */
  gzipFilePath: string;
  /** The content to be cached and compressed. */
  content: Promise<string>;
}

/**
 * Options for wrapper around Response()
 */
export interface responseWrapperOptions {
  /** The content for the response */
  content: ArrayBuffer | Promise<string>;
  /** The Content-Type for the response */
  contentType: string;
  /** The Content-Disposistion for the response */
  contentDisposistion?: string;
  /** The Cache-Control for the response */
  cacheControl?: string;
  /** The Content-Encoding for the response */
  contentEncoding?: string;
  /** The Etag for the response */
  etag?: string;
  /** The Last-Modified timestamp for the response */
  lastModified?: Date;
  /** The timestamp until this resource expires */
  expires?: Date;
  /** The object containing the request */
  request: IncomingMessage;
  /** The object containing the response */
  response: ServerResponse;
}

/**
 * Options for caching and serving content.
 */
export interface cacheAndServeContentOptions {
  /** The name of the file to cache. */
  fileName: string;
  /** The content type of the file. */
  contentType: string;
  /** The Cache-Control header for this resource. */
  cacheControl?: string;
  /** A function that generates the content to be cached. */
  contentGenerator: () => Promise<string>;
  /** Whether to check the database last change time instead of the API last check time. */
  dbOnlyCheck?: boolean;
  /** The object containing the request */
  request: IncomingMessage;
  /** The object containing the response */
  response: ServerResponse;
}

/**
 * Options for serving a static file.
 */
export interface serveStaticFileOptions {
  /** The path to the file to serve. */
  filePath: string;
  /**  The content type of the file. */
  contentType?: string;
  /** The content disposistion if served as a file to download. */
  contentDisposistion?: string;
  /** The Cache-Control header for this resource. */
  cacheControl?: string;
  /** The object containing the request */
  request: IncomingMessage;
  /** The object containing the response */
  response: ServerResponse;
}

/**
 * Runtime configuaration for the HTTP server.
 */
export interface httpServerConfig {
  /** The OpenRouterAPIWatcher instance. */
  watcher: OpenRouterAPIWatcher;
  /** Whether to disable caching. */
  disableCache: boolean;
  /** The directory containing data files. */
  dataDir: string;
  /** The directory containing cached files. */
  cacheDir: string;
  /** The directory containing web client files. */
  clientDir: string;
  /** The Content-Security-Policy header for this server. */
  contentSecurityPolicy?: string;
  /** The port number to listen on. */
  port: number;
  /** The hostname to listen on. */
  hostname: string;
  /** The public URL of this server, if behing a reverse proxy. */
  publicURL: string;
  /** The cached list of static files to serve. */
  staticFiles: string[];
}

/**
 * Options for the HTTP server.
 */
export interface httpServerOptions {
  /** The OpenRouterAPIWatcher instance to use. */
  watcher: OpenRouterAPIWatcher;
  /** Whether to disable caching. */
  disableCache?: boolean;
  /** The directory containing data files. */
  dataDir?: string;
  /** The directory containing cached files. */
  cacheDir?: string;
  /** The directory containing web client files. */
  clientDir?: string;
  /** The Content-Security-Policy header for this server. */
  contentSecurityPolicy?: string;
  /** The port number to listen on. */
  port?: number;
  /** The hostname to listen on. */
  hostname?: string;
  /** The public URL of this server, if behing a reverse proxy. */
  publicURL?: string;
}

/**
 * The HTTP server for serving the web client, the API and changes as an RSS feed.
 */
export class httpServer {
  private config: httpServerConfig;

  /**
   * Creates a new server instance to serve the web client and changes as an RSS feed.
   * @param config - The options for the server.
   */
  constructor(config: httpServerOptions) {
    this.config = {
      ...defaultConfig,
      ...config,
      staticFiles: [],
    };

    // Read all filenames in the static directory, make sure they are real files, including subdirs
    fs.readdirSync(this.config.clientDir, { recursive: true }).forEach((fileName) => {
      if (typeof fileName === "string") {
        const filePath = path.join(this.config.clientDir, fileName);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          this.config.staticFiles.push(fileName);
        }
      }
    });

    if (this.config.disableCache) {
      console.log("Caching disabled");
    } else {
      // Create the cache directory if it doesn't exist
      if (!fs.existsSync(this.config.cacheDir)) {
        try {
          fs.mkdirSync(this.config.cacheDir, { recursive: true });
        } catch (err) {
          console.error("Error creating cache directory:", err);
          throw err;
        }
      }
    }

    /**
     * Creates the Node http server instance with a callback to serve incoming requests.
     */
    const server = http.createServer((req, res) => this.requestCallback(req, res));

    server.listen(this.config.port, this.config.hostname, () => {
      this.config.watcher.log(`Webinterface running at URL ${this.config.publicURL}`);
    });
  }

  /**
   * Creates a 404 error response.
   * @param filePath - The file path that was not found.
   * @param response - The response object.
   * @param message - The error message.
   */
  error404(filePath: string, response: ServerResponse, message: string = "File not found"): void {
    console.log(`Error 404: ${filePath} ${message}`);
    response.statusCode = 404;
    response.end(message);
  }

  /**
   * Calculates the Etag for a file.
   * @param filePath - The path to the file.
   * @returns - The Etag for the file.
   */
  async calculateEtag(filePath: string): Promise<string> {
    const stats = await fs.promises.stat(filePath);
    const content = await fs.promises.readFile(filePath);
    const hash = crypto.createHash("sha256");
    hash.update(content);
    hash.update(stats.mtime.toISOString());
    return `"${hash.digest("hex")}"`;
  }

  /**
   * Retrieves the last modified timestamp for a file.
   * @param filePath - The path to the file.
   * @returns - The last modified timestamp of the file.
   */
  async getLastModifiedTimestamp(filePath: string): Promise<Date> {
    try {
      const stats = await fs.promises.stat(filePath);
      return stats.mtime;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return new Date(0);
      }
      throw error;
    }
  }

  /**
   * Caches and compresses a file.
   * @param options - The options for caching and compressing the file.
   * @returns - The calculated Etag for the file.
   */
  async cacheAndCompressFile({
    cacheFilePath,
    gzipFilePath,
    content,
  }: cacheAndCompressFileOptions): Promise<string> {
    // This async function runs in the background, so it can be raced.
    // Work around this problem by creating temporary files and check for their existence.

    const cacheFilePathTmp = cacheFilePath + ".tmp";
    const gzipFilePathTmp = gzipFilePath + ".tmp";
    const etagFilePath = cacheFilePath + ".etag";
    const etagFilePathTmp = etagFilePath + ".tmp";

    // Don't race me!
    if (
      fs.existsSync(cacheFilePathTmp) ||
      fs.existsSync(gzipFilePathTmp) ||
      fs.existsSync(etagFilePathTmp)
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
    const etag = await this.calculateEtag(cacheFilePathTmp);
    await fs.promises.writeFile(etagFilePathTmp, etag);

    // Rename the temporary files to their final destinations,
    // this should be almost atomic.
    await fs.promises.rename(cacheFilePathTmp, cacheFilePath);
    await fs.promises.rename(gzipFilePathTmp, gzipFilePath);
    await fs.promises.rename(etagFilePathTmp, etagFilePath);

    return etag;
  }

  /**
   * Checks if a file is fresh (i.e., its modification time is greater than
   * or equal to the given last modified time).
   * @param filePath - The path to the file.
   * @param lastModified - The last modified time to compare against.
   * @returns - True if the file is fresh, false otherwise.
   */
  async checkFileFreshness(filePath: string, lastModified: Date): Promise<boolean> {
    return (await this.getLastModifiedTimestamp(filePath)) >= lastModified;
  }

  /**
   * Calculates the remaining time in seconds until the next API check is due.
   * @returns - The remaing time in seconds until the next API is due.
   */
  secondsUntilAPIcheck(): number {
    const timeDiff = Date.now() - this.config.watcher.getAPILastCheck.getTime();
    const msRemaining = 3_600_000 - timeDiff;
    if (msRemaining > 0) {
      return Math.floor(msRemaining / 1000);
    }
    return 0;
  }

  /**
   * Generates the default value for Cache-Control based on time left until next API check.
   * @returns - The value for Cache-Control based on time left until next API check.
   */
  defaultCacheControl(): string {
    return "public, max-age=" + this.secondsUntilAPIcheck();
  }

  /**
   * Wrapper around Response()
   * @param responseWrapperOptions - The options for responseWrapper
   * @returns - The final response
   */
  async responseWrapper({
    content,
    contentType,
    contentDisposistion,
    cacheControl,
    contentEncoding,
    etag,
    lastModified,
    expires,
    request,
    response,
  }: responseWrapperOptions): Promise<void> {
    // Create response headers
    response.setHeader("Content-Type", contentType);
    if (contentDisposistion) {
      response.setHeader("Content-Disposistion", contentDisposistion);
    }
    if (this.config.contentSecurityPolicy) {
      response.setHeader("Content-Security-Policy", this.config.contentSecurityPolicy);
    }
    if (contentEncoding) {
      response.setHeader("Content-Encoding", contentEncoding);
    }
    if (!this.config.disableCache) {
      response.setHeader("Cache-Control", cacheControl ? cacheControl : this.defaultCacheControl());
    }
    if (etag && etag !== "") {
      response.setHeader("Etag", etag);
    }
    if (lastModified) {
      response.setHeader("Last-Modified", lastModified.toUTCString());
    }
    let expiresDate = new Date(0);
    if (expires) {
      expiresDate = expires;
    } else {
      expiresDate = new Date(new Date().getTime() + this.secondsUntilAPIcheck() * 1_000);
    }
    response.setHeader("Expires", expiresDate.toUTCString());

    const realContent = await content;
    let length = 0;
    if (typeof realContent === "string") {
      length = realContent.length ?? 0;
    } else {
      // assume content is an ArrayBuffer
      length = realContent.byteLength ?? 0;
    }
    // if (request.method === "HEAD") {
    // HTTP HEAD method, this should never return a body, but include all headers
    // Content-Length gets overwritten by Response() to 0, if no body is present
    // X-Content-Length is a workaround to see the actual length of the resource
    // response.setHeader("X-Content-Length", length);
    // }
    response.setHeader("Content-Length", length); // let's try anyway to see if it works sometime
    response.statusCode = request.method === "HEAD" ? 204 : 200;
    // response.statusCode = 200;
    response.write(request.method === "HEAD" ? "" : realContent);
    response.end();
  }

  /**
   * Caches and serves content, using cached files if they are fresh.
   * @param options - The options for caching and serving the content.
   * @returns - The response to be sent to the client.
   */
  async cacheAndServeContent({
    fileName,
    contentType,
    cacheControl,
    contentGenerator,
    dbOnlyCheck = false,
    request,
    response,
  }: cacheAndServeContentOptions): Promise<void> {
    // Generate and serve content directly if caching is disabled
    if (this.config.disableCache) {
      const content = contentGenerator();
      return this.responseWrapper({ content, contentType, cacheControl, request, response });
    }

    const cacheFilePath = path.join(this.config.cacheDir, fileName);
    const gzipFilePath = `${cacheFilePath}.gz`;
    const etagFilePath = `${cacheFilePath}.etag`;

    const lastModified = dbOnlyCheck
      ? this.config.watcher.getDBLastChange
      : this.config.watcher.getAPILastCheck;

    if (
      !(await this.checkFileFreshness(cacheFilePath, lastModified)) ||
      !(await this.checkFileFreshness(gzipFilePath, lastModified)) ||
      !fs.existsSync(etagFilePath)
    ) {
      const content = contentGenerator();
      // create cache files in background while serving content direcly
      await this.cacheAndCompressFile({ cacheFilePath, content, gzipFilePath });
      // return this.responseWrapper({ content, contentType, cacheControl, request, response });
    }

    // Serve the cached file
    return this.serveStaticFile({
      filePath: cacheFilePath,
      contentType,
      cacheControl,
      request,
      response,
    });
  }

  /**
   * Serves a static file, optionally serving a gzipped version if the client accepts it.
   * @param options - The options for serving the static file.
   * @returns - The response to be sent to the client.
   */
  async serveStaticFile({
    filePath,
    contentType = mime.contentType(path.extname(filePath)) || "application/octet-stream",
    contentDisposistion,
    cacheControl,
    request,
    response,
  }: serveStaticFileOptions): Promise<void> {
    const lastModified = await this.getLastModifiedTimestamp(filePath);
    const gzipFilePath = filePath.endsWith(".gz") ? filePath : `${filePath}.gz`;
    const etagFilePath = `${filePath}.etag`;
    let etag = "";

    // Get the Etag for the file if it exists
    if (fs.existsSync(etagFilePath)) {
      etag = await fs.promises.readFile(etagFilePath, "utf8");
    }

    // Check if the client has a cached version of the file
    const clientEtag = request.headers["if-none-match"];
    if (clientEtag && clientEtag === etag) {
      response.statusCode = 304;
      response.end();
      return;
    }

    // Check if the client has a cached version of the file
    const clientLastModified = request.headers["if-modified-since"];
    if (typeof clientLastModified === "string") {
      const clientModifiedDate = new Date(clientLastModified);
      // Account for potential small differences in timestamps
      const timeDiff = Math.abs(lastModified.getTime() - clientModifiedDate.getTime());
      if (timeDiff <= 1000) {
        response.statusCode = 304;
        response.end();
        return;
      }
    }

    // Check if the client accepts gzip compression
    const acceptsGzip = request.headers["accept-encoding"]?.includes("gzip");

    if (fs.existsSync(filePath)) {
      // only check for compressed files if the original uncompressed file exists
      if (acceptsGzip && fs.existsSync(gzipFilePath)) {
        const uncompressedModTime = (await this.getLastModifiedTimestamp(filePath)).getTime();
        const compressedModTime = (await this.getLastModifiedTimestamp(gzipFilePath)).getTime();

        // only serve compressed files that are at least as new as the original
        if (compressedModTime >= uncompressedModTime) {
          return this.responseWrapper({
            content: await fs.promises.readFile(gzipFilePath),
            contentType,
            contentDisposistion,
            cacheControl,
            contentEncoding: "gzip",
            etag,
            lastModified,
            request,
            response,
          });
        }
        // fall through to serve uncompressed (or compressed by default) file
      }
      return this.responseWrapper({
        content: await fs.promises.readFile(filePath),
        contentType,
        contentDisposistion,
        cacheControl,
        etag,
        lastModified,
        request,
        response,
      });
    } else {
      return this.error404(filePath, response);
    }
  }

  /**
   * Generates an RSS feed XML string.
   * @returns - The RSS feed XML.
   */
  async generateRSSFeedXML(): Promise<string> {
    const feed: RSS = new RSS({
      title: "OpenRouter Model Changes",
      description: "Feed for detected changes in the OpenRouter model list",
      feed_url: this.config.publicURL + "rss",
      site_url: this.config.publicURL,
      image_url: this.config.publicURL + "favicon.svg",
      docs: "https://github.com/fry69/orw",
      language: "en",
      ttl: 60,
      pubDate: this.config.watcher.getDBLastChange,
    });

    const changesRSS = this.config.watcher.getLists.changes.slice(0, 50); // first 50 entries, sorted newest first

    for (const change of changesRSS) {
      feed.item({
        title: `Model ${change.id} ${change.type}`,
        description: `${renderToStaticMarkup(
          React.createElement(ChangeSnippet, { change, hideTypes: [] })
        )}`,
        url: `${this.config.publicURL}model?id=${change.id}&timestamp=${change.timestamp}`,
        date: change.timestamp,
      });
    }

    return feed.xml();
  }

  /**
   * The request callback handler.
   * @param request - The incoming request object.
   * @param response - the server response object.
   */
  async requestCallback(request: IncomingMessage, response: ServerResponse) {
    const url = new URL(request.url!, "http://localhost");

    // Serve all files found in the client directory from the root
    if (this.config.staticFiles.includes(url.pathname.slice(1))) {
      return this.serveStaticFile({
        filePath: path.join(this.config.clientDir, url.pathname),
        request,
        response,
      });
    }

    const statusRepsone = (): APIStatus => ({
      isValid: true,
      isDevelopment,
      apiLastCheck: this.config.watcher.getAPILastCheck.toISOString(),
      apiLastCheckStatus: this.config.watcher.getAPILastCheckStatus,
      dbLastChange: this.config.watcher.getDBLastChange.toISOString(),
    });

    // All other endpoints require special handling
    switch (url.pathname) {
      case API__LISTS:
        return this.cacheAndServeContent({
          fileName: "lists.json",
          contentType: "application/json",
          contentGenerator: async (): Promise<string> => {
            const response: APIResponse = {
              version: API_VERSION,
              lists: this.config.watcher.getLists,
            };
            return JSON.stringify(response);
          },
          dbOnlyCheck: true,
          request,
          response,
        });

      case API__STATUS:
        return this.cacheAndServeContent({
          fileName: "status.json",
          contentType: "application/json",
          contentGenerator: async (): Promise<string> => {
            const response: APIResponse = {
              version: API_VERSION,
              status: statusRepsone(),
            };
            return JSON.stringify(response);
          },
          request,
          response,
        });

      case "/rss":
        return this.cacheAndServeContent({
          fileName: "rss.xml",
          contentType: "application/rss+xml",
          contentGenerator: () => this.generateRSSFeedXML(),
          dbOnlyCheck: true,
          request,
          response,
        });

      case "/":
      case "/list":
      case "/removed":
      case "/changes":
      case "/model":
        // Serve the index.html file containing the React app
        return this.serveStaticFile({
          filePath: path.join(this.config.clientDir, "index.html"),
          request,
          response,
        });

      case "/orw.db.gz":
        // Serve database backup file for bootstrapping other installations
        return this.serveStaticFile({
          filePath: this.config.watcher.getDbBackupPath + ".gz",
          contentDisposistion: 'attachment; filename="orw.db.gz"',
          request,
          response,
        });

      default:
        return this.error404(url.pathname, response);
    }
  }
}
