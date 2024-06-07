// server.test.ts
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { IncomingMessage, ServerResponse } from "node:http";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";
import { httpServer } from "./httpServer";

describe("httpServer", () => {
  let server: httpServer;
  let watcher: any;
  let dataDir: string;
  let cacheDir: string;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "vitest-httpServer"));
    cacheDir = path.join(dataDir, "cache");

    watcher = {
      log: vi.fn(),
      getAPILastCheck: new Date(),
      getAPILastCheckStatus: "success",
      getDBLastChange: new Date(),
      getLists: {
        models: [],
        removed: [],
        changes: [
          { id: "1", type: "added", timestamp: new Date().toISOString() },
          { id: "2", type: "removed", timestamp: new Date().toISOString() },
        ],
      },
      getDbBackupPath: path.join(dataDir, "backup", "orw.db.backup"),
    };

    server = new httpServer({ watcher, dataDir, cacheDir });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(dataDir, { recursive: true });
  });

  describe("error404", () => {
    it("should log the error and send a 404 response", () => {
      const response = {
        statusCode: 0,
        end: vi.fn(),
      } as unknown as ServerResponse;

      const consoleMock = vi.spyOn(console, "log");
      afterAll(() => {
        consoleMock.mockReset();
      });

      server.error404("/some/file.txt", response);

      expect(console.log).toHaveBeenCalledWith("Error 404: /some/file.txt File not found");
      expect(response.statusCode).toBe(404);
      expect(response.end).toHaveBeenCalledWith("File not found");
    });
  });

  describe("calculateEtag", () => {
    it("should calculate the Etag for a file", async () => {
      vi.spyOn(fs.promises, "stat").mockResolvedValue({
        mtime: new Date("2023-04-01T00:00:00.000Z"),
      } as fs.Stats);

      vi.spyOn(fs.promises, "readFile").mockResolvedValue(Buffer.from("test content"));

      const etag = await server.calculateEtag("/some/file.txt");

      expect(etag).toBe('"da728123ca15c422664b35e6c9a63d452eb42b1b86501c0cd309e59205c8f6cb"');
    });
  });

  describe("getLastModifiedTimestamp", () => {
    it("should return the last modified timestamp for a file", async () => {
      vi.spyOn(fs.promises, "stat").mockResolvedValue({
        mtime: new Date("2023-04-01T00:00:00.000Z"),
      } as fs.Stats);

      const lastModified = await server.getLastModifiedTimestamp("/some/file.txt");

      expect(lastModified).toEqual(new Date("2023-04-01T00:00:00.000Z"));
    });

    it("should return a default date if the file does not exist", async () => {
      vi.spyOn(fs.promises, "stat").mockRejectedValue({ code: "ENOENT" });

      const lastModified = await server.getLastModifiedTimestamp("/some/file.txt");

      expect(lastModified).toEqual(new Date(0));
    });
  });

  describe("cacheAndCompressFile", () => {
    it("should cache and compress a file", async () => {
      const cacheFilePath = path.join(dataDir, "cache", "test.txt");
      const gzipFilePath = `${cacheFilePath}.gz`;
      const etagFilePath = `${cacheFilePath}.etag`;

      vi.spyOn(fs, "existsSync").mockReturnValue(false);
      vi.spyOn(fs.promises, "rename").mockResolvedValue();
      vi.spyOn(server, "calculateEtag").mockResolvedValue('"test-etag"');

      const etag = await server.cacheAndCompressFile({
        cacheFilePath,
        gzipFilePath,
        content: Promise.resolve("test content"),
      });

      expect(etag).toBe('"test-etag"');
      expect(fs.existsSync).toHaveBeenCalledWith(`${cacheFilePath}.tmp`);
      expect(fs.existsSync).toHaveBeenCalledWith(`${gzipFilePath}.tmp`);
      expect(fs.existsSync).toHaveBeenCalledWith(`${etagFilePath}.tmp`);
      expect(fs.promises.rename).toHaveBeenCalledTimes(3);

      // fs.rmSync(`${cacheFilePath}.tmp`);
      // fs.rmSync(`${gzipFilePath}.tmp`);
      // fs.rmSync(`${etagFilePath}.tmp`);
    });
  });

  describe("checkFileFreshness", () => {
    it("should return true if the file is fresh", async () => {
      vi.spyOn(server, "getLastModifiedTimestamp").mockResolvedValue(
        new Date("2023-04-01T00:00:00.000Z")
      );

      const isFresh = await server.checkFileFreshness(
        "/some/file.txt",
        new Date("2023-03-01T00:00:00.000Z")
      );

      expect(isFresh).toBe(true);
    });

    it("should return false if the file is not fresh", async () => {
      vi.spyOn(server, "getLastModifiedTimestamp").mockResolvedValue(
        new Date("2023-03-01T00:00:00.000Z")
      );

      const isFresh = await server.checkFileFreshness(
        "/some/file.txt",
        new Date("2023-04-01T00:00:00.000Z")
      );

      expect(isFresh).toBe(false);
    });
  });

  describe("secondsUntilAPIcheck", () => {
    it("should return the remaining time in seconds until the next API check", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2023-04-01T00:01:00.000Z"));

      watcher.getAPILastCheck = new Date("2023-04-01T00:00:00.000Z");
      const secondsUntil = server.secondsUntilAPIcheck();

      expect(secondsUntil).toBe(3600 - 60);

      vi.useRealTimers();
    });

    it("should return 0 if the next API check is overdue", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2023-04-01T01:00:00.000Z"));

      watcher.getAPILastCheck = new Date("2023-03-31T23:00:00.000Z");
      const secondsUntil = server.secondsUntilAPIcheck();

      expect(secondsUntil).toBe(0);

      vi.useRealTimers();
    });
  });

  describe("defaultCacheControl", () => {
    it("should generate the default Cache-Control value based on the time until the next API check", () => {
      vi.spyOn(server, "secondsUntilAPIcheck").mockReturnValue(3600);
      const cacheControl = server.defaultCacheControl();
      expect(cacheControl).toBe("public, max-age=3600");
    });
  });

  describe("responseWrapper", () => {
    it("should create a response with the provided options", async () => {
      const request = {
        method: "GET",
      } as unknown as IncomingMessage;

      const response = {
        setHeader: vi.fn(),
        statusCode: 0,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;

      await server.responseWrapper({
        content: Promise.resolve("test content"),
        contentType: "text/plain",
        contentDisposistion: 'attachment; filename="test.txt"',
        cacheControl: "max-age=3600",
        contentEncoding: "gzip",
        etag: '"test-etag"',
        lastModified: new Date("2023-04-01T00:00:00.000Z"),
        expires: new Date("2023-04-01T01:00:00.000Z"),
        request,
        response,
      });

      expect(response.setHeader).toHaveBeenCalledWith("Content-Type", "text/plain");
      expect(response.setHeader).toHaveBeenCalledWith(
        "Content-Disposistion",
        'attachment; filename="test.txt"'
      );
      expect(response.setHeader).toHaveBeenCalledWith("Content-Encoding", "gzip");
      expect(response.setHeader).toHaveBeenCalledWith("Cache-Control", "max-age=3600");
      expect(response.setHeader).toHaveBeenCalledWith("Etag", '"test-etag"');
      expect(response.setHeader).toHaveBeenCalledWith(
        "Last-Modified",
        "Sat, 01 Apr 2023 00:00:00 GMT"
      );
      expect(response.setHeader).toHaveBeenCalledWith("Expires", "Sat, 01 Apr 2023 01:00:00 GMT");
      expect(response.setHeader).toHaveBeenCalledWith("Content-Length", 12);
      expect(response.statusCode).toBe(200);
      expect(response.write).toHaveBeenCalledWith("test content");
      expect(response.end).toHaveBeenCalled();
    });
  });

  describe("cacheAndServeContent", () => {
    it("should serve content directly if caching is disabled", async () => {
      server = new httpServer({ watcher, dataDir, cacheDir, disableCache: true });

      const request = {
        headers: {},
        method: "GET",
      } as unknown as IncomingMessage;

      const response = {
        setHeader: vi.fn(),
        statusCode: 0,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;

      vi.spyOn(server, "responseWrapper").mockImplementation(() => Promise.resolve());

      await server.cacheAndServeContent({
        fileName: "test.txt",
        contentType: "text/plain",
        contentGenerator: () => Promise.resolve("test content"),
        request,
        response,
      });

      expect(server.responseWrapper).toHaveBeenCalledWith({
        content: expect.any(Promise),
        contentType: "text/plain",
        cacheControl: undefined,
        request,
        response,
      });
    });

    it("should serve cached content if it is fresh", async () => {
      const request = {
        headers: {},
        method: "GET",
      } as unknown as IncomingMessage;

      const response = {
        setHeader: vi.fn(),
        statusCode: 0,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;

      vi.spyOn(server, "checkFileFreshness").mockResolvedValue(true);
      vi.spyOn(server, "serveStaticFile").mockImplementation(() => Promise.resolve());

      await server.cacheAndServeContent({
        fileName: "test.txt",
        contentType: "text/plain",
        contentGenerator: () => Promise.resolve("test content"),
        request,
        response,
      });

      expect(server.serveStaticFile).toHaveBeenCalledWith({
        filePath: path.join(dataDir, "cache", "test.txt"),
        contentType: "text/plain",
        cacheControl: undefined,
        request,
        response,
      });
    });

    it("should cache and serve content if the cached version is not fresh", async () => {
      const request = {
        headers: {},
        method: "GET",
      } as unknown as IncomingMessage;

      const response = {
        setHeader: vi.fn(),
        statusCode: 0,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;

      vi.spyOn(server, "checkFileFreshness").mockResolvedValue(false);
      vi.spyOn(server, "cacheAndCompressFile");
      vi.spyOn(server, "responseWrapper").mockImplementation(() => Promise.resolve());

      await server.cacheAndServeContent({
        fileName: "test.txt",
        contentType: "text/plain",
        contentGenerator: () => Promise.resolve("test content"),
        request,
        response,
      });

      expect(server.cacheAndCompressFile).toHaveBeenCalledWith({
        cacheFilePath: path.join(dataDir, "cache", "test.txt"),
        gzipFilePath: path.join(dataDir, "cache", "test.txt.gz"),
        content: expect.any(Promise),
      });

      expect(server.responseWrapper).toHaveBeenCalledWith({
        content: expect.anything(),
        etag: expect.anything(),
        lastModified: expect.anything(),
        contentDisposistion: undefined,
        contentType: "text/plain",
        cacheControl: undefined,
        request,
        response,
      });
    });
  });

  describe("serveStaticFile", () => {
    it("should serve a 304 Not Modified response if the client has a cached version of the file based on eTag", async () => {
      const request = {
        method: "GET",
        headers: {
          "if-none-match": '"test-etag"',
        },
      } as unknown as IncomingMessage;

      const response = {
        write: vi.fn(),
        setHeader: vi.fn(),
        statusCode: 0,
        end: vi.fn(),
      } as unknown as ServerResponse;

      fs.writeFileSync(path.join(dataDir, "test.txt"), "test content");
      fs.writeFileSync(path.join(dataDir, "test.txt.etag"), '"test-etag"');

      // vi.spyOn(fs.promises, "readFile").mockResolvedValue(Buffer.from("test content"));
      vi.spyOn(server, "getLastModifiedTimestamp").mockResolvedValue(
        new Date("2023-04-01T00:00:00.000Z")
      );
      // vi.spyOn(fs.promises, "readFile").mockResolvedValue('"test-etag"');

      await server.serveStaticFile({
        filePath: path.join(dataDir, "test.txt"),
        request,
        response,
      });

      expect(response.statusCode).toBe(304);
      expect(response.end).toHaveBeenCalled();
    });

    it("should serve a 304 Not Modified response if the client has a cached version of the file based on last modified date", async () => {
      const request = {
        method: "GET",
        headers: {
          "if-modified-since": "Sat, 01 Apr 2023 00:00:00 GMT",
        },
      } as unknown as IncomingMessage;

      const response = {
        setHeader: vi.fn(),
        statusCode: 0,
        end: vi.fn(),
      } as unknown as ServerResponse;

      vi.spyOn(fs.promises, "readFile").mockResolvedValue(Buffer.from("test content"));
      vi.spyOn(server, "getLastModifiedTimestamp").mockResolvedValue(
        new Date("2023-04-01T00:00:00.000Z")
      );

      await server.serveStaticFile({
        filePath: path.join(dataDir, "test.txt"),
        request,
        response,
      });

      expect(response.statusCode).toBe(304);
      expect(response.end).toHaveBeenCalled();
    });

    it("should serve a 404 Not Found response if the file does not exist", async () => {
      const request = {
        headers: {},
        method: "GET",
      } as unknown as IncomingMessage;

      const response = {
        setHeader: vi.fn(),
        statusCode: 0,
        end: vi.fn(),
      } as unknown as ServerResponse;

      vi.spyOn(fs.promises, "readFile").mockRejectedValue({ code: "ENOENT" });
      vi.spyOn(server, "error404").mockImplementation(() => {});

      await server.serveStaticFile({
        filePath: path.join(dataDir, "non-existent.txt"),
        request,
        response,
      });

      expect(server.error404).toHaveBeenCalledWith(
        path.join(dataDir, "non-existent.txt"),
        response
      );
    });
  });

  describe("requestCallback", () => {
    it("should serve static files from the client directory", async () => {
      const request = {
        method: "GET",
        url: "/index.html",
      } as unknown as IncomingMessage;

      const response = {
        setHeader: vi.fn(),
        statusCode: 0,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;

      vi.spyOn(server, "serveStaticFile").mockImplementation(() => Promise.resolve());

      await server.requestCallback(request, response);

      expect(server.serveStaticFile).toHaveBeenCalledWith({
        filePath: path.join("dist", "index.html"),
        request,
        response,
      });
    });

    it("should serve the API__LISTS endpoint", async () => {
      const request = {
        method: "GET",
        url: "/api/lists",
      } as unknown as IncomingMessage;

      const response = {
        setHeader: vi.fn(),
        statusCode: 0,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;

      vi.spyOn(server, "cacheAndServeContent").mockImplementation(() => Promise.resolve());

      await server.requestCallback(request, response);

      expect(server.cacheAndServeContent).toHaveBeenCalledWith({
        fileName: "lists.json",
        contentType: "application/json",
        contentGenerator: expect.any(Function),
        dbOnlyCheck: true,
        request,
        response,
      });
    });

    it("should serve the API__STATUS endpoint", async () => {
      const request = {
        method: "GET",
        url: "/api/status",
      } as unknown as IncomingMessage;

      const response = {
        setHeader: vi.fn(),
        statusCode: 0,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;

      vi.spyOn(server, "cacheAndServeContent").mockImplementation(() => Promise.resolve());

      await server.requestCallback(request, response);

      expect(server.cacheAndServeContent).toHaveBeenCalledWith({
        fileName: "status.json",
        contentType: "application/json",
        contentGenerator: expect.any(Function),
        request,
        response,
      });
    });

    it("should serve the RSS feed", async () => {
      const request = {
        method: "GET",
        url: "/rss",
      } as unknown as IncomingMessage;

      const response = {
        setHeader: vi.fn(),
        statusCode: 0,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;

      vi.spyOn(server, "cacheAndServeContent").mockImplementation(() => Promise.resolve());
      vi.spyOn(server, "generateRSSFeedXML").mockResolvedValue("rss feed xml");

      await server.requestCallback(request, response);

      expect(server.cacheAndServeContent).toHaveBeenCalledWith({
        fileName: "rss.xml",
        contentType: "application/rss+xml",
        contentGenerator: expect.any(Function),
        dbOnlyCheck: true,
        request,
        response,
      });
    });

    it("should serve the database backup file", async () => {
      const request = {
        method: "GET",
        url: "/orw.db.gz",
      } as unknown as IncomingMessage;

      const response = {
        setHeader: vi.fn(),
        statusCode: 0,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;

      vi.spyOn(server, "serveStaticFile").mockImplementation(() => Promise.resolve());

      await server.requestCallback(request, response);

      expect(server.serveStaticFile).toHaveBeenCalledWith({
        filePath: expect.stringContaining("/backup/orw.db.backup.gz"),
        contentDisposistion: 'attachment; filename="orw.db.gz"',
        request,
        response,
      });
    });

    it("should return a 404 Not Found response for unknown endpoints", async () => {
      const request = {
        method: "GET",
        url: "/unknown",
      } as unknown as IncomingMessage;

      const response = {
        setHeader: vi.fn(),
        statusCode: 0,
        end: vi.fn(),
      } as unknown as ServerResponse;

      vi.spyOn(server, "error404").mockImplementation(() => {});

      await server.requestCallback(request, response);

      expect(server.error404).toHaveBeenCalledWith("/unknown", response);
    });
  });
});
