/// <reference lib="deno.ns" />
// main.ts - Main entry point for ORW Deno server
import { join } from "@std/path";
import { parseArgs } from "@std/cli/parse-args";
import { OpenRouterAPIWatcher } from "./watcher.ts";
import { HTTPServer } from "./httpServer.ts";
import { createDatabase } from "./database.ts";

const VERSION = "3.0.0-deno";

interface CLIArgs {
  help?: boolean;
  version?: boolean;
  port?: number;
  hostname?: string;
  background?: boolean;
  query?: number;
  "run-once"?: boolean;
  "data-dir"?: string;
}

/**
 * Display help information.
 */
function showHelp() {
  console.log(`
OpenRouter Watcher (ORW) v${VERSION}

Usage: deno run --allow-net --allow-read --allow-write main.ts [options]

Options:
  -h, --help              Show this help message
  -v, --version           Show version information
  -p, --port <number>     Port to run the HTTP server on (default: 3100)
  --hostname <string>     Hostname to bind to (default: localhost)
  -b, --background        Run in background mode (continuous monitoring)
  -q, --query <number>    Query mode: show recent changes (default: 10)
  -r, --run-once          Run once and exit
  --data-dir <path>       Data directory path (default: ./data)

Examples:
  deno run --allow-all main.ts --background
  deno run --allow-all main.ts --query 20
  deno run --allow-all main.ts --run-once
  deno run --allow-all main.ts --port 8080 --hostname 0.0.0.0
`);
}

/**
 * Main application entry point.
 */
async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ["help", "version", "background", "run-once"],
    string: ["hostname", "data-dir"],
    alias: {
      h: "help",
      v: "version",
      p: "port",
      b: "background",
      q: "query",
      r: "run-once",
    },
  }) as CLIArgs;

  if (args.help) {
    showHelp();
    return;
  }

  if (args.version) {
    console.log(`ORW v${VERSION}`);
    return;
  }

  // Configuration
  const dataDir = args["data-dir"] || Deno.env.get("ORW_DATA_PATH") || "./data";
  const port = args.port || parseInt(Deno.env.get("ORW_PORT") || "3100");
  const hostname = args.hostname || Deno.env.get("ORW_HOSTNAME") || "localhost";
  const dbPath = join(dataDir, "orw.db");

  console.log(`ORW v${VERSION} starting...`);
  console.log(`Data directory: ${dataDir}`);
  console.log(`Database: ${dbPath}`);

  try {
    // Initialize database
    const db = await createDatabase(dbPath);
    console.log("Database initialized");

    // Initialize watcher
    const watcher = new OpenRouterAPIWatcher({ db });
    console.log("Watcher initialized");

    // Handle different modes
    if (args.query !== undefined) {
      // Query mode: show recent changes
      const limit = typeof args.query === "number" ? args.query : 10;
      console.log(`\nShowing ${limit} most recent changes:`);
      await watcher.runQueryMode(limit);
      return;
    }

    if (args["run-once"]) {
      // Run once mode: check for changes once and exit
      console.log("Running single check...");
      await watcher.runOnce();
      console.log("Check completed");
      return;
    }

    // Server mode (default): start HTTP server
    const staticDir = Deno.env.get("ORW_STATIC_DIR") || "./dist";
    
    const server = new HTTPServer({
      port,
      hostname,
      watcher,
      staticDir,
      enableCors: true,
    });

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log("\nShutting down...");
      await server.stop();
      db.close();
      Deno.exit(0);
    };

    // Set up signal handlers
    Deno.addSignalListener("SIGINT", shutdown);
    Deno.addSignalListener("SIGTERM", shutdown);

    // Start server
    await server.start();

    // Enter background mode if requested
    if (args.background) {
      await watcher.enterBackgroundMode();
    } else {
      console.log("Server running. Use --background flag to enable automatic API monitoring.");
      console.log("Press Ctrl+C to stop.");
    }

  } catch (error) {
    console.error("Failed to start ORW:", error);
    Deno.exit(1);
  }
}

// Run main function if this is the main module
if (import.meta.main) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    Deno.exit(1);
  });
}
