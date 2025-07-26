import type { DatabaseSync } from "sqlite";

export const version = 3;

export function up(db: DatabaseSync) {
  // Fix changes entries without data
  db.exec(`
    UPDATE changes
    SET changes = (
      SELECT data
      FROM models
      WHERE changes.id = models.id
    )
    WHERE changes = '{}'
  `);

  // Create a new table for storing removed models
  // account for multiple removals of the same model id (could get re-added)
  db.exec(`
    CREATE TABLE IF NOT EXISTS removed_models (
      id TEXT,
      data TEXT,
      timestamp TEXT,
      PRIMARY KEY (id, timestamp)
    )
  `);

  // Create a new table for storing added models
  // account for multiple additions of the same model id (could get re-added)
  db.exec(`
    CREATE TABLE IF NOT EXISTS added_models (
      id TEXT,
      data TEXT,
      timestamp TEXT,
      PRIMARY KEY (id, timestamp)
    )
  `);

  // Add already known added model from the changes table to the added_models table
  db.exec(`
    INSERT INTO added_models (id, data, timestamp)
    SELECT id, changes, timestamp
    FROM changes WHERE type = 'added'
  `);
}
