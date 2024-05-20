// orw.ts
import fs from "node:fs";
import path from "node:path";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Database } from "bun:sqlite";
import { diff } from "deep-diff";
import type { Model, ModelDiff, Status } from "./global";
import { runMigrations } from "./db-migration";
import { createServer } from "./server";
import { VERSION } from "./version";

export const isDevelopment = import.meta.env.NODE_ENV === "development" || false;
const fixedModelFilePath = import.meta.env.ORW_MODEL_FILE || "./models.json";
const backupDir = import.meta.env.ORW_BACKUP_PATH || "./backup";
const logFilePath = import.meta.env.ORW_LOG_PATH ?? "./orw.log";
const dbFilePath = import.meta.env.ORW_DB_PATH ?? "./orw.db";

let fixedModelList: Model[] = [];
if (isDevelopment) {
  // Don't query the acutal API during development, use a fixed model list instead if present
  if (await Bun.file(fixedModelFilePath).exists()) {
    fixedModelList = JSON.parse(await Bun.file(fixedModelFilePath).text()).data;
  } else {
    console.log("No fixed model list found for development, generate a snapshot with:");
    console.log("curl https://openrouter.ai/api/v1/models > models.json");
  }
  console.log("--- Watcher initializing in development mode ---");
}

/**
 * Watches for changes in OpenRouter models and stores the changes in a SQLite database.
 */
export class OpenRouterAPIWatcher {
  /**
   * The SQLite database used for storing model changes.
   */
  private db: Database;

  /**
   * A flag indicating whether the watcher is in the initial setup phase.
   */
  private initFlag: boolean = false;

  /**
   * Path to the logfile, log only if set
   */
  private logFilePath?: string;

  /**
   * Memory cache for the last model list from the database
   */
  private lastModelList: Model[] = [];

  /**
   * Get cached model list
   * @returns {Model[]} - The cached model list
   */
  get getLastModelList(): Model[] {
    return this.lastModelList;
  }

  /**
   * Status object containing db / runtime stats
   */
  private status: Status = {
    /**
     * Timestamp of the data in the database
     */
    dbLastChange: new Date(0),

    /**
     * Timestamp of the last API check
     */
    apiLastCheck: new Date(0),

    /**
     * Status of the last API check
     */
    apiLastCheckStatus: "unknown",
  };

  /**
   * Get last change timestamp recorded in the database
   * @returns {Date} - Last change timestamp
   */
  get getDBLastChange(): Date {
    return this.status.dbLastChange;
  }
  /**
   * Get timestamp of the last OpenRouter API check
   * @returns {Date} - Last API check timestamp
   */
  get getAPILastCheck(): Date {
    return this.status.apiLastCheck;
  }
  /**
   * Get status of the last OpenRouter API check result
   * @returns {string} - Last API check result status
   */
  get getAPILastCheckStatus(): string {
    return this.status.apiLastCheckStatus;
  }

  /**
   * Get the path to the current database backup file.
   * @returns {string} -  The path to the current database backup file.
   */
  get getDbBackupPath(): string {
    return path.join(backupDir, path.basename(dbFilePath) + ".backup");
  }

  /**
   * Creates a new instance of the OpenRouterAPIWatcher class.
   * @param {Database} db  - The SQLite database to use for storing model changes.
   * @param {string} [logFilePath]  - Path to the logfile
   */
  constructor(db: Database, logFilePath?: string) {
    this.db = db;
    runMigrations(db);

    this.lastModelList = this.loadLastModelList();
    this.loadAPILastCheck();

    if (this.lastModelList.length === 0) {
      // Seed the database with the current model list if it's a fresh database
      this.log("empty model list in database");
      this.initFlag = true;

      this.getModelList().then((newModels) => {
        if (newModels.length > 0) {
          this.status.apiLastCheckStatus = "success";
          this.updateAPILastCheck();
          this.lastModelList = newModels;
          this.status.dbLastChange = new Date();
          this.storeModelList(newModels, this.status.dbLastChange);
          this.log("seeded database with model list from API");
        }
      });
    }

    if (logFilePath) {
      this.logFilePath = logFilePath;
      // Check if the log file exists, if not, create it
      if (!fs.existsSync(this.logFilePath)) {
        fs.writeFileSync(this.logFilePath, "");
      }
      if (isDevelopment) {
        this.log("watcher initialized");
      }
    }

    if (backupDir) {
      // Create the backup directory if it doesn't exist
      if (!fs.existsSync(backupDir)) {
        try {
          fs.mkdirSync(backupDir, { recursive: true });
        } catch (err) {
          const message = `Error creating backup directory at ${backupDir}: ${err}`;
          this.error(message);
          console.error(message);
          throw err;
        }
      }
    }
  }

  /**
   * Receives error messages and outputs to console and logfile
   * @param {string} message - Error message
   */
  error(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] Error: ${message}`;

    // Log the message to the console
    console.error(logMessage);

    // Log the message to the log file
    if (this.logFilePath) {
      fs.appendFileSync(this.logFilePath, `${logMessage}\n`);
    }
  }

  /**
   * Receives informational messages and outputs to console and logfile
   * @param {string} [message] - Message text
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
    if (this.logFilePath) {
      fs.appendFileSync(this.logFilePath, `${logMessage}\n`);
    }
  }

  /**
   * Fetches the current list of OpenRouter models from the API.
   * @returns {Model[]} - A Promise that resolves to an array of Model objects.
   */
  async getModelList(): Promise<Model[]> {
    if (isDevelopment) {
      this.log(
        "Warning: using fixed model list, switch to production mode to load live model list from API"
      );
      return fixedModelList;
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/models");
      this.status.apiLastCheck = new Date();
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
      this.status.apiLastCheckStatus = "failed";
    }
    this.status.apiLastCheckStatus = "failed";
    this.updateAPILastCheck();
    return [];
  }

  /**
   * Updates the last check API timestamp in the database and application.
   */
  updateAPILastCheck() {
    this.db.run(
      "INSERT OR REPLACE INTO last_api_check (id, last_check, last_status) VALUES (1, ?, ?);",
      [this.status.apiLastCheck.toISOString(), this.status.apiLastCheckStatus]
    );
  }

  /**
   * Stores the current list of OpenRouter models in the SQLite database.
   * @param {Model[]} models - An array of Model objects to store.
   * @param {Date} [timestamp] - The timestamp to associate with the model list.
   */
  storeModelList(models: Model[], timestamp: Date = new Date()) {
    this.db.run("DELETE FROM models");
    for (const model of models) {
      this.db.run("INSERT INTO models (id, data, timestamp) VALUES (?, ?, ?)", [
        model.id,
        JSON.stringify(model),
        timestamp.toISOString(),
      ]);
    }
  }

  /**
   * Stores a removed model from the OpenRouter models list in the SQLite database.
   * @param {Model} model - Removed Model object to store.
   * @param {Date} [timestamp] - The timestamp to associate with the removal.
   */
  storeRemovedModel(model: Model, timestamp: Date = new Date()) {
    this.db.run("INSERT INTO removed_models (id, data, timestamp) VALUES (?, ?, ?)", [
      model.id,
      JSON.stringify(model),
      timestamp.toISOString(),
    ]);
  }

  /**
   * Stores an added model to the OpenRouter models list in the SQLite database.
   * @param {Model} model - Added Model object to store.
   * @param {Date} [timestamp] - The timestamp to associate with the addition.
   */
  storeAddedModel(model: Model, timestamp: Date = new Date()) {
    this.db.run("INSERT INTO added_models (id, data, timestamp) VALUES (?, ?, ?)", [
      model.id,
      JSON.stringify(model),
      timestamp.toISOString(),
    ]);
  }

  /**
   * Loads the most recent list of OpenRouter models from the SQLite database.
   * @returns An array of Model objects.
   */
  loadLastModelList(): Model[] {
    let mostRecentTimestamp = new Date(0);
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
    const models: Model[] = this.db
      .query(query)
      .all()
      .map((row: any) => {
        const currentTimestamp = new Date(row.model_timestamp);
        if (currentTimestamp > mostRecentTimestamp) {
          mostRecentTimestamp = currentTimestamp;
        }
        const parsedData = JSON.parse(row.data);
        if (row.added_timestamp) {
          return { ...parsedData, added_at: row.added_timestamp };
        }
        return parsedData;
      });
    this.status.dbLastChange = mostRecentTimestamp;
    return models;
  }

  /**
   * Loads list of removed OpenRouter models from the SQLite database.
   * @returns An array of Model objects.
   */
  loadRemovedModelList(): Model[] {
    const removedModels: Model[] = this.db
      .query("SELECT timestamp, data FROM removed_models ORDER BY timestamp DESC")
      .all()
      .map((row: any) => {
        const model: Model = JSON.parse(row.data);
        model["removed_at"] = row.timestamp;
        return model;
      });
    return removedModels;
  }

  /**
   * Loads various state and counters from the database and updates the internal status
   */
  loadAPILastCheck() {
    const result: any = this.db
      .query("SELECT last_check, last_status FROM last_api_check WHERE id = 1")
      .get();
    if (result) {
      this.status.apiLastCheck = new Date(result.last_check) ?? new Date(0);
      this.status.apiLastCheckStatus = result.last_status ?? "unknown";
    }
  }

  /**
   * Transform a row from the changes table to an ModelDiff object
   * @param {any} row - The row from the database to transform
   * @returns {ModelDiff}
   */
  private transformChangesRow = (row: any): ModelDiff => {
    const changes = JSON.parse(row.changes);
    if (row.type === "changed") {
      return {
        id: row.id,
        type: row.type,
        changes,
        timestamp: new Date(row.timestamp),
      };
    }
    return {
      id: row.id,
      type: row.type,
      model: changes,
      timestamp: new Date(row.timestamp),
    };
  };

  /**
   * Loads the most recent model changes from the SQLite database.
   * @param {number} [n] - The maximum number of changes to load.
   * @returns {ModelDiff[]} - An array of ModelDiff objects.
   */
  loadChanges(n?: number): ModelDiff[] {
    if (n) {
      return this.db
        .query("SELECT id, type, changes, timestamp FROM changes ORDER BY timestamp DESC LIMIT ?")
        .all(n)
        .map(this.transformChangesRow);
    } else {
      return this.db
        .query("SELECT id, type, changes, timestamp FROM changes ORDER BY timestamp DESC")
        .all()
        .map(this.transformChangesRow);
    }
  }

  /**
   * Stores a list of model changes in the SQLite database.
   * @param {ModelDiff[]} changes - An array of ModelDiff objects to store.
   */
  storeChanges(changes: ModelDiff[]) {
    for (const change of changes) {
      this.db.run("INSERT INTO changes (id, type, changes, timestamp) VALUES (?, ?, ?, ?)", [
        change.id,
        change.type,
        change.changes ? JSON.stringify(change.changes) : JSON.stringify(change.model),
        change.timestamp.toISOString(),
      ]);
    }
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
          timestamp,
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
          timestamp,
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
            timestamp: new Date(),
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
    // skip check on initialization
    if (this.initFlag) {
      this.initFlag = false;
    } else {
      let newModels = await this.getModelList();
      if (newModels.length === 0) {
        this.status.apiLastCheckStatus = "unknown";
        this.updateAPILastCheck();
        this.error("empty model list from API, retry in one minute");
        await new Promise((resolve) => setTimeout(resolve, 60_000)); // 1 minute
        newModels = await this.getModelList();
      }
      if (newModels.length === 0) {
        this.status.apiLastCheckStatus = "failed";
        this.error("empty model list from API after retry, skipping check");
      } else {
        const oldModels = this.lastModelList;
        const changes = this.findChanges(newModels, oldModels);
        this.status.apiLastCheckStatus = "success";
        this.updateAPILastCheck();
        if (changes.length > 0) {
          const timestamp = new Date();
          this.storeModelList(newModels, timestamp);
          this.storeChanges(changes);
          this.log("Changes detected:");
          this.log(JSON.stringify(changes, null, 4));
          // re-load model list from db to keep added_at properties
          // copying the API model list removes all added_at properties
          this.lastModelList = this.loadLastModelList();
          this.status.dbLastChange = timestamp;
          // Create a database backup
          await this.backupDb();
          // no need to fall through
          return;
        }
      }
      this.updateAPILastCheck();
    }
  }

  /**
   * Runs the OpenRouterAPIWatcher only once
   */
  public async runOnce() {
    await this.check();
  }

  /**
   * Backups the database, saving previous backup
   * @param {boolean} [initial] - If set only create a backup if none exists
   */
  private async backupDb(initial: boolean = false) {
    const dbBackupFile = path.basename(dbFilePath) + ".backup";
    const dbBackupFilePath = path.join(backupDir, dbBackupFile);
    if (initial && (await Bun.file(dbBackupFilePath).exists())) {
      return;
    }
    const dbPrevBackupFilePath = dbBackupFilePath + ".prev";
    if (await Bun.file(dbBackupFilePath).exists()) {
      this.log("Moving current database backup");
      if (await Bun.file(dbPrevBackupFilePath).exists()) {
        await fs.promises.unlink(dbPrevBackupFilePath);
      }
      await fs.promises.rename(dbBackupFilePath, dbPrevBackupFilePath);
    }
    this.log("Creating new database backup");
    this.db.run(`VACUUM INTO '${dbBackupFilePath}'`);

    // create compressed backup file to serve for bootstrapping
    const dbBackupFilePathGz = dbBackupFilePath + ".gz";
    if (await Bun.file(dbBackupFilePathGz).exists()) {
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
      this.log("API check");
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

if (import.meta.main) {
  // Usage:
  if (Bun.argv.includes("--version")) {
    console.log(`orw Version ${VERSION}`);
    process.exit(0);
  } else if (Bun.argv.includes("--query")) {
    if (!fs.existsSync(dbFilePath)) {
      console.error(`Error: database ${dbFilePath} not found`);
      process.exit(1);
    }
    const n = parseInt(Bun.argv[Bun.argv.indexOf("--query") + 1] || "10", 10);
    const db = new Database(dbFilePath);
    const watcher = new OpenRouterAPIWatcher(db);
    watcher.runQueryMode(n);
    db.close();
    process.exit(0);
  } else if (Bun.argv.includes("--once")) {
    const db = new Database(dbFilePath);
    const watcher = new OpenRouterAPIWatcher(db, logFilePath);
    watcher.runOnce();
    db.close();
    process.exit(0);
  } else {
    const db = new Database(dbFilePath);
    const watcher = new OpenRouterAPIWatcher(db, logFilePath);
    const server = createServer(watcher);
    watcher.enterBackgroundMode();
    // db.close(); // Don't close the database here, as the background mode runs indefinitely
  }
}
