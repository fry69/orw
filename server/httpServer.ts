// httpServer.ts - Simplified HTTP server for Deno
import { serveDir } from "@std/http/file-server";
import { isDevelopment, type OpenRouterAPIWatcher } from "./watcher.ts";
import { API_VERSION } from "../shared/constants.ts";
import { isValidRoute } from "../shared/routes.ts";

export interface ServerConfig {
  port: number;
  hostname?: string;
  watcher: OpenRouterAPIWatcher;
  staticDir: string;
  enableCors?: boolean;
}

/**
 * Simple HTTP server for ORW using Deno's built-in HTTP server.
 */
export class HTTPServer {
  private config: ServerConfig;
  private server?: Deno.HttpServer;

  constructor(config: ServerConfig) {
    this.config = {
      hostname: "localhost",
      enableCors: true,
      ...config,
    };
  }

  /**
   * Handle API requests and serve static files.
   */
  private async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // Optional: Log requests for debugging (uncomment in development)
    // console.log(`${request.method} ${pathname}`);

    // Add CORS headers if enabled
    const corsHeaders: Record<string, string> = this.config.enableCors
      ? {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
      : {};

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    try {
      // API routes
      if (pathname.startsWith("/api/")) {
        const response = this.handleAPIRequest(pathname, request);
        return new Response(response.body, {
          status: response.status,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
            ...response.headers,
          },
        });
      }

      // Try to serve static files first
      const staticResponse = await this.tryServeStatic(request);
      if (staticResponse.status !== 404) {
        return staticResponse;
      }

      // Fallback to index.html for SPA routes (if request accepts HTML)
      const acceptHeader = request.headers.get("accept") || "";
      if (acceptHeader.includes("text/html")) {
        // Check if this is a valid React Router route using shared manifest
        if (isValidRoute(pathname)) {
          return await this.serveIndexHtml();
        }

        // Unknown HTML route - return proper 404 page
        return new Response(
          `
<!DOCTYPE html>
<html>
<head>
  <title>404 - Page Not Found</title>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; }
    h1 { color: #e74c3c; }
    .back-link { color: #3498db; text-decoration: none; }
    .back-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>404 - Page Not Found</h1>
  <p>The page <code>${this.escapeXml(pathname)}</code> could not be found.</p>
  <p><a href="/" class="back-link">← Back to Home</a></p>
</body>
</html>`,
          {
            status: 404,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              ...corsHeaders,
            },
          },
        );
      }

      // Return 404 for non-HTML requests to non-existent files
      return new Response("Not Found", {
        status: 404,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error("Server error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }
  }

  /**
   * Try to serve a static file, returning 404 if not found.
   */
  private async tryServeStatic(request: Request): Promise<Response> {
    try {
      return await serveDir(request, {
        fsRoot: this.config.staticDir,
        urlRoot: "",
        showDirListing: false,
        showIndex: false, // Don't auto-serve index.html here
        enableCors: this.config.enableCors,
      });
    } catch {
      return new Response("Not Found", { status: 404 });
    }
  }

  /**
   * Serve the index.html file for SPA routing.
   */
  private async serveIndexHtml(): Promise<Response> {
    try {
      const indexPath = `${this.config.staticDir}/index.html`;
      const indexFile = await Deno.readTextFile(indexPath);

      return new Response(indexFile, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          // Prevent caching of index.html for SPA routes to ensure fresh content
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
          ...this.config.enableCors
            ? {
              "Access-Control-Allow-Origin": "*",
            }
            : {},
        },
      });
    } catch (error) {
      console.error("Failed to serve index.html:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  /**
   * Handle API-specific requests.
   */
  private handleAPIRequest(
    pathname: string,
    _request: Request,
  ): { body: string; status: number; headers?: Record<string, string> } {
    switch (pathname) {
      case "/api/lists": {
        const lists = this.config.watcher.getLists;
        const response_lists = {
          lists: lists,
          version: API_VERSION,
        };
        return {
          body: JSON.stringify(response_lists),
          status: 200,
        };
      }

      case "/api/status": {
        const response_status = {
          status: {
            dbLastChange: this.config.watcher.getDBLastChange,
            apiLastCheck: this.config.watcher.getAPILastCheck,
            apiLastCheckStatus: this.config.watcher.getAPILastCheckStatus,
            isDevelopment,
            isValid: true,
          },
          version: API_VERSION,
        };
        return {
          body: JSON.stringify(response_status),
          status: 200,
        };
      }

      case "/api/rss": {
        const rssXml = this.generateRSS();
        return {
          body: rssXml,
          status: 200,
          headers: {
            "Content-Type": "application/rss+xml",
          },
        };
      }

      default:
        return {
          body: JSON.stringify({ error: "Not found" }),
          status: 404,
        };
    }
  }

  /**
   * Generate RSS feed from recent changes.
   */
  private generateRSS(): string {
    const lists = this.config.watcher.getLists;
    const baseUrl = `http://${this.config.hostname}:${this.config.port}`;
    const now = new Date().toUTCString();

    let rssItems = "";

    // Get the 20 most recent changes for RSS
    const recentChanges = lists.changes.slice(0, 20);

    for (const change of recentChanges) {
      const title = `${change.type.toUpperCase()}: ${change.id}`;
      const description = change.type === "changed"
        ? `Changes: ${Object.keys(change.changes || {}).join(", ")}`
        : change.type === "added"
        ? `New model: ${change.model?.name || change.id}`
        : `Removed model: ${change.id}`;

      const pubDate = new Date(change.timestamp).toUTCString();

      rssItems += `
    <item>
      <title>${this.escapeXml(title)}</title>
      <description>${this.escapeXml(description)}</description>
      <pubDate>${pubDate}</pubDate>
      <guid>${baseUrl}/change/${change.id}/${change.timestamp}</guid>
    </item>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>OpenRouter Watcher</title>
    <description>OpenRouter model changes and updates</description>
    <link>${baseUrl}</link>
    <lastBuildDate>${now}</lastBuildDate>
    <generator>ORW Deno Server</generator>${rssItems}
  </channel>
</rss>`;
  }

  /**
   * Escape XML special characters.
   */
  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Start the HTTP server.
   */
  public start(): void {
    console.log(`Starting HTTP server on ${this.config.hostname}:${this.config.port}`);

    this.server = Deno.serve({
      hostname: this.config.hostname,
      port: this.config.port,
      handler: (request) => this.handleRequest(request),
    });

    console.log(`Server running at http://${this.config.hostname}:${this.config.port}`);
  }

  /**
   * Stop the HTTP server.
   */
  public async stop(): Promise<void> {
    if (this.server) {
      await this.server.shutdown();
      console.log("HTTP server stopped");
    }
  }
}
