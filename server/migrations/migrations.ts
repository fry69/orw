import { type Database } from "better-sqlite3";

/**
 * Represents an array of database migrations.
 */
export interface Migration {
  /** Migration version number. */
  version: number;
  /** Function to apply the migration. */
  up: (db: Database) => void;
}

/**
 * Array of database migrations.
 */
const migrations: Migration[] = [
  {
    version: 1,
    up: (db: Database) => {
      db.exec(
        `
        CREATE TABLE IF NOT EXISTS models (
          id TEXT PRIMARY KEY,
          data TEXT,
          timestamp TEXT
        )
      `
      );
      db.exec(
        `
        CREATE TABLE IF NOT EXISTS changes (
          id TEXT,
          changes TEXT,
          timestamp TEXT
        )
      `
      );
      db.exec(
        `
        CREATE TABLE IF NOT EXISTS migrations (
          version INTEGER PRIMARY KEY
        )
      `
      );
    },
  },
  {
    version: 2,
    up: (db: Database) => {
      // Create a new table with the primary key constraint
      db.exec(
        `
        CREATE TABLE changes_new (
          id TEXT,
          changes TEXT,
          timestamp TEXT,
          type TEXT,
          PRIMARY KEY (id, timestamp)
        )
      `
      );

      // Copy data from the old table to the new table
      db.exec(
        `
        INSERT INTO changes_new (id, changes, timestamp, type)
          SELECT id, changes, timestamp, 'changed'
          FROM changes
      `
      );

      // Drop the old table and rename the new table
      db.exec(`DROP TABLE changes`);
      db.exec(`ALTER TABLE changes_new RENAME TO changes`);
    },
  },
  {
    version: 3,
    up: (db: Database) => {
      // Fix changes entries without data
      db.exec(
        `
        UPDATE changes
        SET changes = (
	        SELECT data
	        FROM models
	        WHERE changes.id = models.id
        )
        WHERE changes = '{}';
      `
      );
      // Create a new table for storing removed models
      // account for multiple removals of the same model id (could get re-added)
      db.exec(
        `
        CREATE TABLE IF NOT EXISTS removed_models (
          id TEXT,
          data TEXT,
          timestamp TEXT,
          PRIMARY KEY (id, timestamp)
        );
      `
      );
      // Create a new table for storing added models
      // account for multiple additions of the same model id (could get re-added)
      db.exec(
        `
        CREATE TABLE IF NOT EXISTS added_models (
          id TEXT,
          data TEXT,
          timestamp TEXT,
          PRIMARY KEY (id, timestamp)
        );
      `
      );
      // Add already known added model from the changes table to the added_models table
      db.exec(
        `
        INSERT INTO added_models (id, data, timestamp)
        SELECT id, changes, timestamp
        FROM changes WHERE type = 'added'
      `
      );
    },
  },
  {
    version: 4,
    up: (db: Database) => {
      // Create table to store last API check timestamp
      db.exec(
        `
        CREATE TABLE IF NOT EXISTS last_api_check (
          id INTEGER PRIMARY KEY,
          last_check TEXT NOT NULL
        );
      `
      );
    },
  },
  {
    version: 5,
    up: (db: Database) => {
      // Create column to store last API check result status
      db.exec(
        `
        ALTER TABLE last_api_check
          ADD last_status TEXT
      `
      );
    },
  },

  // Add more migrations here
];

export default migrations;
