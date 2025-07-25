#!/usr/bin/env -S deno run --allow-all
// cli.ts - Dedicated CLI entry point
import { parseArgs } from "@std/cli/parse-args";
import { join } from "@std/path";
import { OpenRouterAPIWatcher } from "./server/watcher.ts";
import { createDatabase } from "./server/database.ts";

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
  -b, --background        Run in background mode (continuous monitoring)
  -q, --query <number>    Query mode: show recent changes (default: 10)
  -r, --run-once          Run once and exit
  --data-dir <path>       Data directory path (default: ./data)

Examples:
  deno run --allow-all cli.ts --background
  deno run --allow-all cli.ts --query 20
  deno run --allow-all cli.ts --run-once
`);
}

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
    Deno.exit(0);
  }

  if (args.version) {
    console.log(`ORW v${VERSION}`);
    Deno.exit(0);
  }

  // Configuration
  const dataDir = args["data-dir"] || Deno.env.get("ORW_DATA_PATH") || "./data";
  const dbPath = join(dataDir, "orw.db");

  console.log(`ORW v${VERSION} (CLI Mode)`);
  console.log(`Data directory: ${dataDir}`);
  console.log(`Database: ${dbPath}`);

  try {
    // Initialize database
    const db = await createDatabase(dbPath);
    console.log("Database initialized");

    if (args.background) {
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
