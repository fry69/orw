// main.ts - Fresh 2 app entry point
import { App, staticFiles } from "fresh";
import type { State } from "./utils.ts";
import { OpenRouterAPIWatcher } from "./server/watcher.ts";
import { createDatabase } from "./server/database.ts";
import { initializeWatcher } from "./lib/watcher-service.ts";
import { parseArgs } from "@std/cli/parse-args";
import { join } from "@std/path";

// CLI argument parsing (reusing existing logic)
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

export const app = new App<State>();

app.use(staticFiles());
app.fsRoutes();

// Only start background services if running in production mode
if (import.meta.main) {
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

  // Configuration
  const dataDir = args["data-dir"] || Deno.env.get("ORW_DATA_PATH") || "./data";
  const port = args.port || parseInt(Deno.env.get("ORW_PORT") || "3100");
  const hostname = args.hostname || Deno.env.get("ORW_HOSTNAME") || "localhost";
  const dbPath = join(dataDir, "orw.db");

  console.log(`ORW v${VERSION} (Fresh 2) starting...`);
  console.log(`Data directory: ${dataDir}`);
  console.log(`Database: ${dbPath}`);

  try {
    // Initialize database
    const db = await createDatabase(dbPath);
    console.log("Database initialized");

    // Initialize watcher for background mode
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
      // Initialize watcher service for API routes
      await initializeWatcher();

      // Start HTTP server
      console.log(`Fresh 2 server starting on http://${hostname}:${port}`);
      await app.listen({ port, hostname });
    }
  } catch (error) {
    console.error("Failed to start ORW:", error);
    Deno.exit(1);
  }
}
