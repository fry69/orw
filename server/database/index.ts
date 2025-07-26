// server/database/index.ts - Database module exports
export { getMigrationStatus, runMigrations } from "./db-migration.ts";
export type { Migration } from "./migrations/migrations.ts";

// Create database function using node:sqlite
import { DatabaseSync } from "sqlite";
import { dirname } from "@std/path";
import { ensureDir } from "@std/fs";

/**
 * Creates and initializes a database connection.
 */
export function createDatabase(dbPath: string): DatabaseSync {
  // Ensure the database directory exists
  ensureDir(dirname(dbPath));

  // Create and return the database instance
  const db: DatabaseSync = new DatabaseSync(dbPath);
  return db;
}
