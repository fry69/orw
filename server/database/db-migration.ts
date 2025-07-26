import type { DatabaseSync } from "sqlite";
import migrations from "./migrations/index.ts";

/**
 * Runs the migrations on the database.
 * @param db - The database to run migrations on.
 */
export function runMigrations(db: DatabaseSync) {
  // Validate migrations are properly numbered
  validateMigrations(migrations);

  // Ensure migrations table exists first
  initializeMigrationsTable(db);

  const currentVersion = getCurrentVersion(db);
  const pendingMigrations = migrations.filter((m) => m.version > currentVersion);

  if (pendingMigrations.length === 0) {
    console.log(`Database is up to date (version ${currentVersion})`);
    return;
  }

  console.log(`Applying ${pendingMigrations.length} migration(s) from version ${currentVersion}`);

  for (const migration of pendingMigrations) {
    applyMigration(db, migration);
  }

  console.log(`Database updated to version ${getCurrentVersion(db)}`);
}

/**
 * Initializes the migrations table if it doesn't exist.
 * @param db - The database to initialize the migrations table in.
 */
function initializeMigrationsTable(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

/**
 * Applies a single migration within a transaction.
 * @param db - The database to apply the migration to.
 * @param migration - The migration to apply.
 */
function applyMigration(
  db: DatabaseSync,
  migration: { version: number; up: (db: DatabaseSync) => void },
) {
  console.log(`Applying migration version ${migration.version}`);

  try {
    // Start transaction
    db.exec("BEGIN TRANSACTION");

    // Apply the migration
    migration.up(db);

    // Record the migration
    setCurrentVersion(db, migration.version);

    // Commit transaction
    db.exec("COMMIT");

    console.log(`✅ Migration ${migration.version} applied successfully`);
  } catch (error) {
    // Rollback on error
    db.exec("ROLLBACK");
    console.error(`❌ Migration ${migration.version} failed:`, error);
    throw new Error(`Migration ${migration.version} failed: ${error}`);
  }
}

/**
 * Gets the current version of the database.
 * @param db - The database to get the current version of.
 * @returns - The current version of the database.
 */
function getCurrentVersion(db: DatabaseSync): number {
  try {
    const row = db.prepare("SELECT MAX(version) AS version FROM migrations").get();
    return Number(row?.version) || 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_err) {
    // If the migrations table doesn't exist, return 0
    return 0;
  }
}

/**
 * Sets the current version of the database.
 * @param db - The database to set the current version of.
 * @param version - The version to set.
 */
function setCurrentVersion(db: DatabaseSync, version: number) {
  const insertVersion = db.prepare("INSERT INTO migrations (version) VALUES (?)");
  insertVersion.run(version);
}

/**
 * Validates that migrations are properly ordered and have no gaps.
 * @param migrations - Array of migrations to validate.
 */
function validateMigrations(migrations: Array<{ version: number }>) {
  const versions = migrations.map((m) => m.version).sort((a, b) => a - b);

  for (let i = 0; i < versions.length; i++) {
    const expected = i + 1;
    if (versions[i] !== expected) {
      throw new Error(
        `Migration validation failed: Expected version ${expected}, found ${versions[i]}`,
      );
    }
  }
}

/**
 * Gets information about applied and pending migrations.
 * @param db - The database to check.
 * @returns Migration status information.
 */
export function getMigrationStatus(db: DatabaseSync) {
  initializeMigrationsTable(db);
  const currentVersion = getCurrentVersion(db);
  const totalMigrations = migrations.length;
  const pendingMigrations = migrations.filter((m) => m.version > currentVersion);

  return {
    currentVersion,
    totalMigrations,
    pendingCount: pendingMigrations.length,
    isUpToDate: pendingMigrations.length === 0,
    pendingVersions: pendingMigrations.map((m) => m.version),
  };
}
