import { type Database } from "better-sqlite3";
import migrations from "./migrations/migrations.js";

/**
 * Runs the migrations on the database.
 * @param db - The database to run migrations on.
 */
export function runMigrations(db: Database) {
  let currentVersion = getCurrentVersion(db);
  // console.log(`Current database version: ${currentVersion}`);

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
 * Gets the current version of the database.
 * @param db - The database to get the current version of.
 * @returns - The current version of the database.
 */
function getCurrentVersion(db: Database): number {
  try {
    const row: any = db.prepare("SELECT MAX(version) AS version FROM migrations").get();
    return row?.version || 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    // If the migrations table doesn't exist, return -1
    return -1;
  }
}

/**
 * Sets the current version of the database.
 * @param db - The database to set the current version of.
 * @param version - The version to set.
 */
function setCurrentVersion(db: Database, version: number) {
  const insertVersion = db.prepare("INSERT INTO migrations (version) VALUES (?)");
  insertVersion.run([version]);
}
