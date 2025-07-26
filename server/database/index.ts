// server/database/index.ts - Database module exports
export { runMigrations, getMigrationStatus } from "./db-migration.ts";
export type { Migration } from "./migrations/index.ts";

// Create database function using node:sqlite (aliased as "sqlite")
import { DatabaseSync } from "sqlite";
import { dirname } from "@std/path";
import { ensureDir } from "@std/fs";

/**
 * Creates and initializes a database connection.
 */
export async function createDatabase(dbPath: string): Promise<DatabaseSync> {
  // Ensure the database directory exists
  await ensureDir(dirname(dbPath));

  // Create and return the database instance
  const db = new DatabaseSync(dbPath);
  return db;
}
