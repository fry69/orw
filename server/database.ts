// database.ts - Simplified database layer for Deno
import { Database } from "sqlite";
import { dirname } from "@std/path";
import { ensureDir } from "@std/fs";

/**
 * Represents a database migration.
 */
export interface Migration {
  /** Migration version number. */
  version: number;
  /** Function to apply the migration. */
  up: (db: Database) => void;
}

/**
 * Database migrations for ORW.
 */
const migrations: Migration[] = [
  {
    version: 1,
    up: (db: Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS models (
          id TEXT PRIMARY KEY,
          data TEXT,
          timestamp TEXT
        )
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS changes (
          id TEXT,
          changes TEXT,
          timestamp TEXT
        )
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
          version INTEGER PRIMARY KEY
        )
      `);
    },
  },
  {
    version: 2,
    up: (db: Database) => {
      // Create a new table with the primary key constraint
      db.exec(`
        CREATE TABLE changes_new (
          id TEXT,
          changes TEXT,
          timestamp TEXT,
          type TEXT,
          PRIMARY KEY (id, timestamp)
        )
      `);

      // Copy data from the old table to the new table
      db.exec(`
        INSERT INTO changes_new (id, changes, timestamp, type)
          SELECT id, changes, timestamp, 'changed'
          FROM changes
      `);

      // Drop the old table and rename the new table
      db.exec(`DROP TABLE changes`);
      db.exec(`ALTER TABLE changes_new RENAME TO changes`);
    },
  },
  {
    version: 3,
    up: (db: Database) => {
      // Fix changes entries without data
      db.exec(`
        UPDATE changes
        SET changes = (
	        SELECT data
	        FROM models
	        WHERE changes.id = models.id
        )
        WHERE changes = '{}';
      `);

      // Create tables for removed and added models
      db.exec(`
        CREATE TABLE IF NOT EXISTS removed_models (
          id TEXT,
          data TEXT,
          timestamp TEXT,
          PRIMARY KEY (id, timestamp)
        );
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS added_models (
          id TEXT,
          data TEXT,
          timestamp TEXT,
          PRIMARY KEY (id, timestamp)
        );
      `);

      // Add already known added models from the changes table
      db.exec(`
        INSERT INTO added_models (id, data, timestamp)
        SELECT id, changes, timestamp
        FROM changes WHERE type = 'added'
      `);
    },
  },
  {
    version: 4,
    up: (db: Database) => {
      // Create table to store last API check timestamp
      db.exec(`
        CREATE TABLE IF NOT EXISTS last_api_check (
          id INTEGER PRIMARY KEY,
          last_check TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 5,
    up: (db: Database) => {
      // Add status column to last_api_check
      db.exec(`
        ALTER TABLE last_api_check
          ADD last_status TEXT
      `);
    },
  },
];

/**
 * Gets the current version of the database.
 */
function getCurrentVersion(db: Database): number {
  try {
    const result = db.prepare("SELECT MAX(version) AS version FROM migrations").get() as {
      version: number | null;
    };
    return result?.version || 0;
  } catch (_err) {
    // If the migrations table doesn't exist, return -1
    return -1;
  }
}

/**
 * Sets the current version of the database.
 */
function setCurrentVersion(db: Database, version: number) {
  const insertVersion = db.prepare("INSERT INTO migrations (version) VALUES (?)");
  insertVersion.run(version);
}

/**
 * Runs database migrations.
 */
export function runMigrations(db: Database) {
  let currentVersion = getCurrentVersion(db);

  // Create the migrations table if it doesn't exist
  if (currentVersion === -1) {
    console.log("Creating migrations table");
    for (const migration of migrations) {
      migration.up(db);
      setCurrentVersion(db, migration.version);
    }
    currentVersion = getCurrentVersion(db);
    console.log(`Current database version: ${currentVersion}`);
  }

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`Applying migration version ${migration.version}`);
      migration.up(db);
      setCurrentVersion(db, migration.version);
    }
  }
}

/**
 * Creates and initializes a database connection.
 */
export async function createDatabase(dbPath: string): Promise<Database> {
  // Ensure the database directory exists
  await ensureDir(dirname(dbPath));

  // Create and return the database instance
  const db = new Database(dbPath);
  return db;
}
