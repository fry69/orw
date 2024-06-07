// watcher.ts
import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import database, { type Database } from "better-sqlite3";
import diffpkg from "deep-diff";
const { diff } = diffpkg; // workaround
import type { Model, ModelDiff, Lists } from "../shared/global";
import { runMigrations } from "./db-migration.js";
import { httpServer } from "./httpServer.js";
import { FETCH_TIMEOUT, OPENROUTER_API_URL, VERSION } from "../shared/constants.js";

export const isDevelopment = process.env.NODE_ENV === "development" || false;
const dataDir = process.env.ORW_DATA_PATH || "./data";

const defaultConfig = {
  dataDir,
  backupDir: process.env.ORW_BACKUP_PATH || path.join(dataDir, "backup"),
  logFilePath: process.env.ORW_LOG_PATH ?? path.join(dataDir, "orw.log"),
  dbFilePath: process.env.ORW_DB_PATH ?? path.join(dataDir, "orw.db"),
  fixedModelList: undefined,
};

/**
 * Represents the private watcher status object.
 */
export interface WatcherStatus {
  /** Timestamp of the last API check. */
  apiLastCheck: Date;
  /** Status of the last API check. */
  apiLastCheckStatus: string;
  /** Timestamp of the data in the database. */
  dbLastChange: Date;
}

/**
 * Represents the watcher configuration object.
 */
export interface WatcherConfig {
  /** The SQLite database used for storing model changes. */
  db: Database;
  /** Directory for storing data files. */
  dataDir?: string;
  /** Path to the SQLite database file. */
  dbFilePath?: string;
  /** Directory for storing backup files. */
  backupDir?: string;
  /** Path to the logfile, log only if set. */
  logFilePath?: string;
  /** Fixed model list, if set, no API calls are made. */
  fixedModelList?: Model[];
}

/**
 * Watches for changes in OpenRouter models and stores the changes in a SQLite database.
 */
export class OpenRouterAPIWatcher {
  private config: WatcherConfig;
  private status: WatcherStatus;
  private lists: Lists; // Memory cache for lists from database.

  /**
   * Creates a new instance of the OpenRouterAPIWatcher class.
   * @param config  - The Watcher configuration.
   */
  constructor(config: WatcherConfig) {
    this.config = {
      ...defaultConfig, // defaults + environment settings
      ...config, // command line + directly invoked settings (these overwrite defaults)
    };

    this.lists = {
      models: [],
      removed: [],
      changes: [],
    };

    this.status = {
      dbLastChange: new Date(0),
      apiLastCheck: new Date(0),
      apiLastCheckStatus: "unknown",
    };

    runMigrations(this.config.db);
    this.loadLists();
    this.loadAPILastCheck();
    if (this.lists.changes.length > 0) {
      const lastChangeTimestamp = this.lists.changes.at(0)?.timestamp;
      if (lastChangeTimestamp) {
        const lastChangeDate = Date.parse(lastChangeTimestamp);
        if (lastChangeDate) {
          this.status.dbLastChange = new Date(lastChangeDate);
        } else {
          this.status.dbLastChange = new Date(0);
        }
      }
    }

    if (this.lists.models.length === 0) {
      // Seed the database with the current model list if it's a fresh database
      this.log("empty model list in database");

      this.getAPIModelList().then((newModels) => {
        if (newModels.length > 0) {
          this.status.apiLastCheckStatus = "success";
          this.updateAPILastCheck();
          this.lists.models = newModels;
          this.status.dbLastChange = new Date();
          this.storeModelList(newModels, this.status.dbLastChange);
          this.log("seeded database with model list from API");
        }
      });
    }

    if (this.config.logFilePath) {
      // Check if the log file exists, if not, create it
      if (!fs.existsSync(this.config.logFilePath)) {
        fs.writeFileSync(this.config.logFilePath, "");
      }
      if (isDevelopment) {
        this.log("watcher initialized");
      }
    }

    if (this.config.backupDir) {
      // Create the backup directory if it doesn't exist
      if (!fs.existsSync(this.config.backupDir)) {
        try {
          fs.mkdirSync(this.config.backupDir, { recursive: true });
        } catch (err) {
          const message = `Error creating backup directory at ${this.config.backupDir}: ${err}`;
          this.error(message);
          console.error(message);
          throw err;
        }
      }
    }
  }

  /**
   * Get cached database lists
   * @returns - The cached database lists object.
   */
  get getLists(): Lists {
    return this.lists;
  }

  /**
   * Get last change timestamp recorded in the database
   * @returns - Last change timestamp
   */
  get getDBLastChange(): Date {
    return this.status.dbLastChange;
  }
  /**
   * Get timestamp of the last OpenRouter API check
   * @returns - Last API check timestamp
   */
  get getAPILastCheck(): Date {
    return this.status.apiLastCheck;
  }
  /**
   * Get status of the last OpenRouter API check result
   * @returns - Last API check result status
   */
  get getAPILastCheckStatus(): string {
    return this.status.apiLastCheckStatus;
  }

  /**
   * Get the path to the current database backup file.
   * @returns -  The path to the current database backup file.
   */
  get getDbBackupPath(): string | undefined {
    if (this.config.backupDir && this.config.dbFilePath) {
      return path.join(this.config.backupDir, path.basename(this.config.dbFilePath) + ".backup");
    }
    return undefined;
  }

  /**
   * Receives error messages and outputs to console and logfile
   * @param message - Error message
   */
  error(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] Error: ${message}`;

    // Log the message to the console
    console.error(logMessage);

    // Log the message to the log file
    if (this.config.logFilePath) {
      fs.appendFileSync(this.config.logFilePath, `${logMessage}\n`);
    }
  }

  /**
   * Receives informational messages and outputs to console and logfile
   * @param message - Message text
   */
  log(message: string = "") {
    const timestamp = new Date().toISOString();
    let logMessage = ""; // just generate a newline by default, without timestamp
    if (!(message === "")) {
      logMessage = `[${timestamp}] ${message}`;
    }

    // Log the message to the console
    console.log(logMessage);

    // Log the message to the log file
    if (this.config.logFilePath) {
      fs.appendFileSync(this.config.logFilePath, `${logMessage}\n`);
    }
  }

  /**
   * Fetches the current list of OpenRouter models from the API.
   * @returns - A Promise that resolves to an array of Model objects.
   */
  async getAPIModelList(): Promise<Model[]> {
    if (isDevelopment) {
      this.log(
        "Warning: using fixed model list, switch to production mode to load live model list from API"
      );
      return this.config.fixedModelList ?? [];
    }
    this.log("API check");
    this.status.apiLastCheck = new Date();
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });
      if (response) {
        const { data } = await response.json();
        if (data) {
          this.status.apiLastCheckStatus = "success";
          this.updateAPILastCheck();
          return data;
        } else {
          this.status.apiLastCheckStatus = "failed";
          this.updateAPILastCheck();
          return [];
        }
      }
    } catch (err: unknown) {
      let errorMessage: string;
      if (err instanceof Error) {
        errorMessage = `model list fetch failed with ${err.message}`;
      } else {
        errorMessage = `model list fetch failed with unknown error ${err}`;
      }
      this.error(errorMessage);
      // fallthrough
    }
    this.status.apiLastCheckStatus = "failed";
    this.updateAPILastCheck();
    return [];
  }

  /**
   * Loads all relevant lists from database.
   */
  loadLists() {
    this.lists.models = this.loadModelList();
    this.lists.removed = this.loadRemovedModelList();
    this.lists.changes = this.loadChanges();
  }

  /**
   * Loads the most recent list of OpenRouter models from the SQLite database.
   * @returns An array of Model objects.
   */
  loadModelList(): Model[] {
    const query = `
    WITH latest_added_models AS (
      SELECT id, MAX(timestamp) AS latest_timestamp
      FROM added_models
      GROUP BY id
    )
    SELECT
      m.id,
      m.data,
      m.timestamp AS model_timestamp,
      lam.latest_timestamp AS added_timestamp
    FROM models m
    LEFT JOIN latest_added_models lam
      ON m.id = lam.id
    `;
    const models: Model[] = this.config.db
      .prepare(query)
      .all()
      .map((row: any) => {
        const parsedData = JSON.parse(row.data);
        if (row.added_timestamp) {
          return { ...parsedData, added_at: row.added_timestamp };
        }
        return parsedData;
      });
    return models;
  }

  /**
   * Stores the current list of OpenRouter models in the SQLite database.
   * @param models - An array of Model objects to store.
   * @param timestamp - The timestamp to associate with the model list.
   */
  storeModelList(models: Model[], timestamp: Date = new Date()) {
    const deleteModels = this.config.db.prepare("DELETE FROM models");
    deleteModels.run();
    const insertModels = this.config.db.prepare(
      "INSERT INTO models (id, data, timestamp) VALUES (?, ?, ?)"
    );
    for (const model of models) {
      insertModels.run([model.id, JSON.stringify(model), timestamp.toISOString()]);
    }
  }

  /**
   * Loads list of removed OpenRouter models from the SQLite database.
   * @returns An array of Model objects.
   */
  loadRemovedModelList(): Model[] {
    const removedModels: Model[] = this.config.db
      .prepare("SELECT timestamp, data FROM removed_models ORDER BY timestamp DESC")
      .all()
      .map((row: any) => {
        const model: Model = JSON.parse(row.data);
        model["removed_at"] = row.timestamp;
        return model;
      });
    return removedModels;
  }

  /**
   * Stores a removed model from the OpenRouter models list in the SQLite database.
   * @param model - Removed Model object to store.
   * @param timestamp - The timestamp to associate with the removal.
   */
  storeRemovedModel(model: Model, timestamp: Date = new Date()) {
    const insertModel = this.config.db.prepare(
      "INSERT INTO removed_models (id, data, timestamp) VALUES (?, ?, ?)"
    );
    insertModel.run([model.id, JSON.stringify(model), timestamp.toISOString()]);
  }

  /**
   * Loads the most recent model changes from the SQLite database.
   * @param n - The maximum number of changes to load.
   * @returns - An array of ModelDiff objects.
   */
  loadChanges(n?: number): ModelDiff[] {
    if (n) {
      return this.config.db
        .prepare("SELECT id, type, changes, timestamp FROM changes ORDER BY timestamp DESC LIMIT ?")
        .all(n)
        .map(this.transformChangesRow);
    } else {
      return this.config.db
        .prepare("SELECT id, type, changes, timestamp FROM changes ORDER BY timestamp DESC")
        .all()
        .map(this.transformChangesRow);
    }
  }

  /**
   * Transform a row from the changes table to an ModelDiff object
   * @param row - The row from the database to transform
   * @returns
   */
  private transformChangesRow = (row: any): ModelDiff => {
    const changes = JSON.parse(row.changes);
    if (row.type === "changed") {
      return {
        id: row.id,
        type: row.type,
        changes,
        timestamp: row.timestamp,
      };
    }
    return {
      id: row.id,
      type: row.type,
      model: changes,
      timestamp: row.timestamp,
    };
  };

  /**
   * Stores a list of model changes in the SQLite database.
   * @param changes - An array of ModelDiff objects to store.
   */
  storeChanges(changes: ModelDiff[]) {
    const insertChanges = this.config.db.prepare(
      "INSERT INTO changes (id, type, changes, timestamp) VALUES (?, ?, ?, ?)"
    );
    for (const change of changes) {
      insertChanges.run([
        change.id,
        change.type,
        change.changes ? JSON.stringify(change.changes) : JSON.stringify(change.model),
        change.timestamp,
      ]);
    }
  }

  /**
   * Stores an added model to the OpenRouter models list in the SQLite database.
   * @param model - Added Model object to store.
   * @param timestamp - The timestamp to associate with the addition.
   */
  storeAddedModel(model: Model, timestamp: Date = new Date()) {
    const insertAdded = this.config.db.prepare(
      "INSERT INTO added_models (id, data, timestamp) VALUES (?, ?, ?)"
    );
    insertAdded.run([model.id, JSON.stringify(model), timestamp.toISOString()]);
  }

  /**
   * Loads last API check timestamp and result status from database and updates internal status.
   */
  loadAPILastCheck() {
    const result: any = this.config.db
      .prepare("SELECT last_check, last_status FROM last_api_check WHERE id = 1")
      .get();
    if (result) {
      if (result.last_check) {
        this.status.apiLastCheck = new Date(result.last_check);
      } else {
        this.status.apiLastCheck = new Date(0);
      }
      this.status.apiLastCheckStatus = result.last_status ?? "unknown";
    }
  }

  /**
   * Updates the last check API timestamp and result status in the database.
   */
  updateAPILastCheck() {
    const replaceLastCheck = this.config.db.prepare(
      "INSERT OR REPLACE INTO last_api_check (id, last_check, last_status) VALUES (1, ?, ?);"
    );
    replaceLastCheck.run([this.status.apiLastCheck.toISOString(), this.status.apiLastCheckStatus]);
  }

  /**
   * Finds the changes between a new list of models and the last stored list of models.
   * @param newModels - The new list of models.
   * @param oldModels - The last stored list of models.
   * @returns An array of ModelDiff objects representing the changes.
   */
  findChanges(newModels: Model[], oldModels: Model[]): ModelDiff[] {
    const changes: ModelDiff[] = [];

    // Check for new models
    for (const newModel of newModels) {
      const oldModel = oldModels.find((m) => m.id === newModel.id);
      if (!oldModel) {
        const timestamp = new Date();
        changes.push({
          id: newModel.id,
          type: "added",
          model: newModel,
          timestamp: timestamp.toISOString(),
        });
        this.storeAddedModel(newModel, timestamp);
      }
    }

    // Check for removed models
    for (const oldModel of oldModels) {
      const newModel = newModels.find((m) => m.id === oldModel.id);
      if (!newModel) {
        const timestamp = new Date();
        changes.push({
          id: oldModel.id,
          type: "removed",
          model: oldModel,
          timestamp: timestamp.toISOString(),
        });
        this.storeRemovedModel(oldModel, timestamp);
      }
    }

    // Check for changes in existing models
    for (const newModel of newModels) {
      const oldModel = oldModels.find((m) => m.id === newModel.id);
      if (oldModel) {
        const diff = this.diffModels(newModel, oldModel);
        if (Object.keys(diff.changes).length > 0) {
          changes.push({
            ...diff,
            id: newModel.id,
            type: "changed",
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    return changes;
  }

  /**
   * Compares two models and returns the differences between them.
   * @param newModel - The new model to compare.
   * @param oldModel - The old model to compare.
   * @returns An object containing the changes between the two models.
   */
  private diffModels(
    newModel: Model,
    oldModel: Model
  ): { changes: { [key: string]: { old: any; new: any } } } {
    const changes: { [key: string]: { old: any; new: any } } = {};
    const diffs = diff(oldModel, newModel);

    if (diffs) {
      for (const d of diffs) {
        if (d.kind === "E") {
          if (d.path) {
            changes[d.path.join(".")] = { old: d.lhs, new: d.rhs };
          }
        }
      }
    }

    return { changes };
  }

  /**
   * High level check logic
   */
  private async check() {
    let newModels = await this.getAPIModelList();
    if (newModels.length === 0) {
      this.status.apiLastCheckStatus = "unknown";
      this.updateAPILastCheck();
      this.error("empty model list from API, retry in one minute");
      await new Promise((resolve) => setTimeout(resolve, 60_000)); // 1 minute
      newModels = await this.getAPIModelList();
    }
    if (newModels.length === 0) {
      this.status.apiLastCheckStatus = "failed";
      this.error("empty model list from API after retry, skipping check");
    } else {
      const oldModels = this.lists.models;
      const changes = this.findChanges(newModels, oldModels);
      this.status.apiLastCheckStatus = "success";
      this.updateAPILastCheck();
      if (changes.length > 0) {
        const timestamp = new Date();
        this.storeModelList(newModels, timestamp);
        this.storeChanges(changes);
        this.log("Changes detected:");
        this.log(JSON.stringify(changes, null, 4));

        // re-load lists from db to keep added properties
        // copying the API model list removes all added properties
        this.loadLists();
        this.status.dbLastChange = timestamp;

        // Create a database backup
        await this.backupDb();
        // no need to fall through
        return;
      }
    }
    this.updateAPILastCheck();
  }

  /**
   * Runs the OpenRouterAPIWatcher only once
   */
  public async runOnce() {
    await this.check();
  }

  /**
   * Backups the database, saving previous backup.
   * @param initial - If set only create a backup if none exists.
   */
  private async backupDb(initial: boolean = false) {
    const dbBackupFilePath = this.getDbBackupPath;
    if (!dbBackupFilePath) {
      return; // no backup path, no backups
    }

    // Skip creating a backup during initialisation, but create one if no backup exists.
    if (initial && fs.existsSync(dbBackupFilePath)) {
      return;
    }
    const dbPrevBackupFilePath = dbBackupFilePath + ".prev";
    if (fs.existsSync(dbBackupFilePath)) {
      this.log("Moving current database backup");
      if (fs.existsSync(dbPrevBackupFilePath)) {
        await fs.promises.unlink(dbPrevBackupFilePath);
      }
      await fs.promises.rename(dbBackupFilePath, dbPrevBackupFilePath);
    }
    this.log("Creating new database backup");
    // this.config.db.run(`VACUUM INTO '${dbBackupFilePath}'`);
    // TODO: VACUUM INTO can fail under extreme circumstances (e.g. concurrent write operation)
    await this.config.db.backup(dbBackupFilePath); // sub-par solution IMHO, but testing it

    // Create compressed backup file to serve for bootstrapping.
    const dbBackupFilePathGz = dbBackupFilePath + ".gz";
    if (fs.existsSync(dbBackupFilePathGz)) {
      await fs.promises.unlink(dbBackupFilePathGz);
    }
    await pipeline(
      fs.createReadStream(dbBackupFilePath),
      createGzip(),
      fs.createWriteStream(dbBackupFilePathGz)
    );

    this.log("Database backup finished");
  }

  /**
   * Runs the main check loop, continuously checking for model changes every hour.
   */
  private async runBackgroundLoop() {
    while (true) {
      await this.check();
      await new Promise((resolve) => setTimeout(resolve, 3_600_000)); // 1 hour
    }
  }

  /**
   * Prepares the OpenRouterAPIWatcher for background mode.
   */
  public async enterBackgroundMode() {
    this.backupDb(true);
    this.log("Watcher running in background mode");
    // Check the last API timestamp and check if it is older than one hour
    const timeDiff = Date.now() - this.status.apiLastCheck.getTime();
    if (timeDiff > 3_600_000) {
      await this.runBackgroundLoop();
      // this never returns...
    }
    // schedule the next API check after the remaining wait time has elapsed
    const sleeptime = 3_600_000 - timeDiff;
    if (sleeptime > 0) {
      this.log(`Next API check in ${(sleeptime / 1_000 / 60).toFixed(0)} minutes`);
      setTimeout(() => this.runBackgroundLoop(), sleeptime);
      // this also should never return...
    } else {
      // this should never happen
      this.log("Rip in the spacetime continuum detected, proceeding anyway");
      await this.runBackgroundLoop();
    }
  }

  /**
   * Runs the OpenRouterAPIWatcher in query mode, displaying the most recent model changes.
   * @param n - The maximum number of changes to display.
   */
  public async runQueryMode(n: number = 10) {
    const changes = this.loadChanges(n);

    changes.forEach((change) => {
      if (change.type === "added") {
        console.log(`New model added with id ${change.id} at ${change.timestamp.toLocaleString()}`);
        console.dir(change.model);
      } else if (change.type === "removed") {
        console.log(`Model id ${change.id} removed at ${change.timestamp.toLocaleString()}`);
      } else if (change.type === "changed") {
        console.log(
          `Change detected for model ${change.id} at ${change.timestamp.toLocaleString()}:`
        );
        for (const [key, { old, new: newValue }] of Object.entries(change.changes!)) {
          console.log(`  ${key}: ${old} -> ${newValue}`);
        }
      }
      console.log();
    });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (isDevelopment) {
    const fixedModelFilePath =
      process.env.ORW_ORW_FIXED_MODEL_FILE || path.join(dataDir, "models.json");
    // Don't query the acutal API during development, use a fixed model list instead if present
    if (fs.existsSync(fixedModelFilePath)) {
      defaultConfig.fixedModelList = JSON.parse(
        fs.readFileSync(fixedModelFilePath).toString()
      ).data;
    } else {
      console.log("No fixed model list found for development, generate a snapshot with:");
      console.log("curl https://openrouter.ai/api/v1/models > models.json");
    }
    console.log("--- Watcher initializing in development mode ---");
  }

  // Usage:
  if (process.argv.includes("--version")) {
    console.log(`orw Version ${VERSION}`);
    process.exit(0);
  } else if (process.argv.includes("--query")) {
    if (!fs.existsSync(defaultConfig.dbFilePath)) {
      console.error(`Error: database ${defaultConfig.dbFilePath} not found`);
      process.exit(1);
    }
    const n = parseInt(process.argv[process.argv.indexOf("--query") + 1] || "10", 10);
    const db = new database(defaultConfig.dbFilePath);
    const watcher = new OpenRouterAPIWatcher({ db });
    watcher.runQueryMode(n);
    db.close();
    process.exit(0);
  } else if (process.argv.includes("--once")) {
    const db = new database(defaultConfig.dbFilePath);
    const watcher = new OpenRouterAPIWatcher({ db });
    watcher.runOnce();
    db.close();
    process.exit(0);
  } else {
    const db = new database(defaultConfig.dbFilePath);
    const watcher = new OpenRouterAPIWatcher({ db });
    new httpServer({ watcher });
    watcher.enterBackgroundMode();
    // db.close(); // Don't close the database here, as the background mode runs indefinitely
  }
}
