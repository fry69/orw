import { Database } from "bun:sqlite";

interface Migration {
  version: number;
  up: (db: Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    up: (db: Database) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS models (
          id TEXT PRIMARY KEY,
          data TEXT,
          timestamp TEXT
        )
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS changes (
          id TEXT,
          changes TEXT,
          timestamp TEXT
        )
      `);
      db.run(`
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
      db.run(`
        CREATE TABLE changes_new (
          id TEXT,
          changes TEXT,
          timestamp TEXT,
          type TEXT,
          PRIMARY KEY (id, timestamp)
        )
      `);

      // Copy data from the old table to the new table
      db.run(`
        INSERT INTO changes_new (id, changes, timestamp, type)
          SELECT id, changes, timestamp, "changed"
          FROM changes
      `);

      // Drop the old table and rename the new table
      db.run(`DROP TABLE changes`);
      db.run(`ALTER TABLE changes_new RENAME TO changes`);
    },
  },
  {
    version: 3,
    up: (db: Database) => {
      // Fix changes entries without data
      db.run(`
        UPDATE changes
        SET changes = (
	        SELECT data
	        FROM models
	        WHERE changes.id = models.id
        )
        WHERE changes = "{}";
      `);
      // Create a new table for storing removed models
      // account for multiple removals of the same model id (could get re-added)
      db.run(`
        CREATE TABLE IF NOT EXISTS removed_models (
          id TEXT,
          data TEXT,
          timestamp TEXT,
          PRIMARY KEY (id, timestamp)
        );
      `);
      // Create a new table for storing added models
      // account for multiple additions of the same model id (could get re-added)
      db.run(`
        CREATE TABLE IF NOT EXISTS added_models (
          id TEXT,
          data TEXT,
          timestamp TEXT,
          PRIMARY KEY (id, timestamp)
        );
      `);
      // Add already known added model from the changes table to the added_models table
      db.run(`
        INSERT INTO added_models (id, data, timestamp)
        SELECT id, changes, timestamp
        FROM changes WHERE type = "added"
      `);
    },
  },
  // Add more migrations here
];

export default migrations;
