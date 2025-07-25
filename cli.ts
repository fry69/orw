#!/usr/bin/env -S deno run --allow-all
// cli.ts - Dedicated CLI entry point
import { parseArgs } from "@std/cli/parse-args";
import { join } from "@std/path";
import { OpenRouterAPIWatcher } from "./server/watcher.ts";
import { createDatabase } from "./server/database.ts";
import { serve } from "./main.ts";

interface CLIArgs {
  help?: boolean;
  version?: boolean;
  port?: number;
  hostname?: string;
  background?: boolean;
  query?: number;
  "run-once"?: boolean;
  "data-dir"?: string;
  serve?: boolean;
  "no-watcher"?: boolean;
}

const VERSION = "4.0.0-fresh2";

function showHelp() {
  console.log(`
OpenRouter Watcher (ORW) v${VERSION}

Usage: deno run --allow-all cli.ts [options]

Options:
  -h, --help              Show this help message
  -v, --version           Show version information
  -p, --port <number>     Port to run the HTTP server on (default: 3100)
  --hostname <string>     Hostname to bind to (default: localhost)
  -s, --serve             Start HTTP server with background watcher (recommended)
  --no-watcher            Disable background watcher when using --serve
  -b, --background        Run in background mode only (no HTTP server)
  -q, --query <number>    Query mode: show recent changes (default: 10)
  -r, --run-once          Run once and exit
  --data-dir <path>       Data directory path (default: ./data)

Examples:
  deno run --allow-all cli.ts --serve                    # Start both server and watcher
  deno run --allow-all cli.ts --serve --no-watcher       # Start server only
  deno run --allow-all cli.ts --background               # Start watcher only
  deno run --allow-all cli.ts --query 20                 # Show recent changes
  deno run --allow-all cli.ts --run-once                 # Run once and exit
`);
}

async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ["help", "version", "background", "run-once", "serve", "no-watcher"],
    string: ["hostname", "data-dir"],
    alias: {
      h: "help",
      v: "version",
      p: "port",
      b: "background",
      q: "query",
      r: "run-once",
      s: "serve",
    },
  }) as CLIArgs;

  if (args.help) {
    showHelp();
    Deno.exit(0);
  }

  if (args.version) {
    console.log(`ORW v${VERSION}`);
    Deno.exit(0);
  }

  // Configuration
  const dataDir = args["data-dir"] || Deno.env.get("ORW_DATA_PATH") || "./data";
  const dbPath = join(dataDir, "orw.db");
  const port = args.port || parseInt(Deno.env.get("ORW_PORT") || "3100");
  const hostname = args.hostname || Deno.env.get("ORW_HOSTNAME") || "localhost";

  console.log(`ORW v${VERSION} (CLI Mode)`);
  console.log(`Data directory: ${dataDir}`);
  console.log(`Database: ${dbPath}`);

  try {
    // Initialize database
    const db = await createDatabase(dbPath);
    console.log("Database initialized");

    if (args.serve) {
      console.log("Starting HTTP server with background watcher...");
      const enableWatcher = !args["no-watcher"];
      await serve({
        port,
        hostname,
        enableWatcher,
      });
    } else if (args.background) {
      const watcher = new OpenRouterAPIWatcher({ db });
      console.log("Starting background watcher...");
      await watcher.enterBackgroundMode();
    } else if (args["run-once"]) {
      const watcher = new OpenRouterAPIWatcher({ db });
      console.log("Running once...");
      await watcher.runOnce();
      Deno.exit(0);
    } else if (args.query !== undefined) {
      const watcher = new OpenRouterAPIWatcher({ db });
      const limit = typeof args.query === "number" ? args.query : 10;
      console.log(`\nShowing ${limit} most recent changes:`);
      await watcher.runQueryMode(limit);
      Deno.exit(0);
    } else {
      console.log("No action specified. Use --help for options.");
      showHelp();
      Deno.exit(1);
    }
  } catch (error) {
    console.error("Failed to start ORW:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
