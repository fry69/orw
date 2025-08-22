import { define } from "../utils.ts";
import { getWatcher } from "../server/index.ts";
import { basename, join } from "@std/path";

export const handler = define.handlers({
  async GET(_req) {
    try {
      await getWatcher(); // Ensure watcher & directories initialized

      const dataDir = Deno.env.get("ORW_DATA_PATH") || "./data";
      const dbPath = Deno.env.get("ORW_DB_PATH") || join(dataDir, "orw.db");
      const backupDir = Deno.env.get("ORW_BACKUP_PATH") || join(dataDir, "backup");
      const backupFilePath = join(backupDir, basename(dbPath) + ".backup");

      let stat;
      try {
        stat = await Deno.stat(backupFilePath);
        if (!stat.isFile) {
          return new Response("No database backup available yet", {
            status: 404,
            headers: { "Content-Type": "text/plain" },
          });
        }
      } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
          return new Response("No database backup available yet", {
            status: 404,
            headers: { "Content-Type": "text/plain" },
          });
        }
        console.error("[dump] Error stating backup file:", err);
        return new Response("Internal server error", {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        });
      }

      let file;
      try {
        file = await Deno.open(backupFilePath, { read: true });
      } catch (err) {
        console.error("[dump] Error opening backup file:", err);
        return new Response("Internal server error", {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        });
      }

      const headers = new Headers({
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${basename(dbPath)}.backup"`,
        "Content-Length": stat.size.toString(),
        "Cache-Control": "no-store",
      });

      // The .readable stream will auto-close the file when done
      return new Response(file.readable, { headers });
    } catch (err) {
      console.error("[dump] Unexpected error:", err);
      return new Response("Internal server error", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      });
    }
  },
});
