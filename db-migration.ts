import { Database } from "bun:sqlite";
import migrations from "./migrations/migrations";

const databaseFile = import.meta.env.WATCHOR_DB_PATH ?? "watch-or.db";
// const databaseFile = "watch-or.db";

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

function getCurrentVersion(db: Database): number {
  try {
    const row: any = db
      .query("SELECT MAX(version) AS version FROM migrations")
      .get();
    return row?.version || 0;
  } catch (err) {
    // If the migrations table doesn't exist, return -1
    return -1;
  }
}

function setCurrentVersion(db: Database, version: number) {
  db.run("INSERT INTO migrations (version) VALUES (?)", [version]);
}

export function main() {
  const db = new Database(databaseFile);
  runMigrations(db);
  db.close();
}
