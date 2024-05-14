// orw.ts
import fs from "node:fs";
import { Database } from "bun:sqlite";
import { diff } from "deep-diff";
import type { Model, ModelDiff, Status } from "./global";
import { runMigrations } from "./db-migration";
import { createServer } from "./server";

export const isDevelopment = import.meta.env.NODE_ENV === "development" || false;
const fixedModelFile = import.meta.env.ORW_MODEL_FILE || "./models.json";

let fixedModelList: Model[] = [];
if (isDevelopment) {
  // Don't query the acutal API during development, use a fixed model list instead if present
  // generate a current model list snapshot with
  // `curl https://openrouter.ai/api/v1/models > models.json`
  if (await Bun.file(fixedModelFile).exists()) {
    fixedModelList = JSON.parse(await Bun.file(fixedModelFile).text()).data;
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
  private logFile?: string;

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
     * Number of changes in database
     */
    dbChangesCount: 0,

    /**
     * Number of removed models in database
     */
    dbRemovedModelCount: 0,
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
   * Get number of changes recorded in the database
   * @returns {number} - Number of changes recorded in database
   */
  get getDBChangesCount(): number {
    return this.status.dbChangesCount;
  }
  /**
   * Get number of models recorded in the database
   * @returns {number} - Number of models recorded in database
   */
  get getDBModelCount(): number {
    return this.lastModelList.length;
  }
  /**
   * Get number of removed models recorded in the database
   * @returns {number} - Number of removed models recorded in database
   */
  get getDBRemovedModelCount(): number {
    return this.status.dbRemovedModelCount;
  }

  /**
   * Creates a new instance of the OpenRouterAPIWatcher class.
   * @param {Database} db  - The SQLite database to use for storing model changes.
   * @param {string} [logFile]  - Path to the logfile
   */
  constructor(db: Database, logFile?: string) {
    this.db = db;
    runMigrations(db);

    this.lastModelList = this.loadLastModelList();

    if (this.lastModelList.length === 0) {
      // Seed the database with the current model list if it's a fresh database
      this.log("empty model list in database");
      this.initFlag = true;

      this.getModelList().then((newModels) => {
        if (newModels.length > 0) {
          this.lastModelList = newModels;
          this.status.dbLastChange = new Date();
          this.storeModelList(newModels, this.status.dbLastChange);
          this.log("seeded database with model list from API");
        }
      });
    }

    if (logFile) {
      this.logFile = logFile;
      // Check if the log file exists, if not, create it
      if (!fs.existsSync(this.logFile)) {
        fs.writeFileSync(this.logFile, "");
      }
      if (isDevelopment) {
        this.log("watcher initialized");
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
    if (this.logFile) {
      fs.appendFileSync(this.logFile, `${logMessage}\n`);
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
    if (this.logFile) {
      fs.appendFileSync(this.logFile, `${logMessage}\n`);
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
      if (response) {
        const { data } = await response.json();
        if (data) {
          this.updateAPILastCheck();
          return data;
        } else {
          return [];
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.error(`model list fetch failed with ${err.message}`);
      } else {
        this.error(`model list fetch failed with unknown error ${err}`);
      }
    }
    return [];
  }

  /**
   * Updates the last check API timestamp in the database and application 
   * @param {Date} timestamp - optional timestap to set the API last check  
   */
  updateAPILastCheck(timestamp: Date = new Date()) {
    this.status.apiLastCheck = timestamp;
    this.db.run("INSERT OR REPLACE INTO last_api_check (id, last_check) VALUES (1, ?);", [
      timestamp.toISOString(),
    ]);
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
    this.loadDBState();
    return models;
  }

  /**
   * Loads list of removed OpenRouter models from the SQLite database.
   * @returns An array of Model objects.
   */
  loadRemovedModelList(): Model[] {
    const removedModels: Model[] = this.db
      .query("SELECT data FROM removed_models ORDER BY timestamp DESC")
      .all()
      .map((row: any) => JSON.parse(row.data));
    this.loadDBState();
    return removedModels;
  }

  /**
   * Loads various state and counters from the database and updates the internal status
   */
  loadDBState() {
    let result: any;

    result = this.db.query("SELECT last_check FROM last_api_check WHERE id = 1").get();
    if (result) {
      this.status.apiLastCheck = new Date(result.last_check) ?? new Date(0);
    }

    result = this.db.query("SELECT count(id) as changesCount FROM changes").get();
    this.status.dbChangesCount = result.changesCount ?? 0;

    result = this.db.query("SELECT count(id) as removedModelCount FROM removed_models").get();
    this.status.dbRemovedModelCount = result.removedModelCount ?? 0;
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
   * @param {number} n - The maximum number of changes to load.
   * @returns {ModelDiff[]} - An array of ModelDiff objects.
   */
  loadChanges(n: number = 10): ModelDiff[] {
    this.loadDBState();
    return this.db
      .query("SELECT id, type, changes, timestamp FROM changes ORDER BY timestamp DESC LIMIT ?")
      .all(n)
      .map(this.transformChangesRow);
  }

  /**
   * Loads the most recent model changes from the SQLite database.
   * @param {number} n - The maximum number of changes to load.
   * @returns {ModelDiff[]} - An array of ModelDiff objects.
   */
  loadChangesForModel(id: string, n: number = 10): ModelDiff[] {
    this.loadDBState();
    return this.db
      .query(
        "SELECT id, type, changes, timestamp FROM changes WHERE id = ? ORDER BY timestamp DESC LIMIT ?"
      )
      .all(id, n)
      .map(this.transformChangesRow);
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
      const newModels = await this.getModelList();
      if (newModels.length === 0) {
        this.error("empty model list from API, skipping check");
      } else {
        this.status.apiLastCheck = new Date();
        const oldModels = this.lastModelList;
        const changes = this.findChanges(newModels, oldModels);

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
        }
      }
    }
  }

  /**
   * Runs the OpenRouterAPIWatcher only once
   */
  public async runOnce() {
    await this.check();
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
    this.log("Watcher running in background mode");
    // Check the last API timestamp and check if it is older than one hour
    const timeDiff = Date.now() - this.status.apiLastCheck.getTime();
    if (timeDiff > 3_600_000) {
      await this.runBackgroundLoop();
      // this never returns...
    }
    // schedule the next API check after the remaining wait time has elapsed
    const sleeptime = 3_600_000 - timeDiff;
    this.log(`Next API check in ${(sleeptime / 1_000 / 60).toFixed(0)} minutes` );
    setTimeout(this.runBackgroundLoop, sleeptime);
    // this also should never return...
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
  const logFile = import.meta.env.ORW_LOG_PATH ?? "orw.log";
  const databaseFile = import.meta.env.ORW_DB_PATH ?? "orw.db";

  // Usage:
  if (Bun.argv.includes("--query")) {
    if (!fs.existsSync(databaseFile)) {
      console.error(`Error: database ${databaseFile} not found`);
      process.exit(1);
    }
    const n = parseInt(Bun.argv[Bun.argv.indexOf("--query") + 1] || "10", 10);
    const db = new Database(databaseFile);
    const watcher = new OpenRouterAPIWatcher(db);
    watcher.runQueryMode(n);
    db.close();
    process.exit(0);
  } else if (Bun.argv.includes("--once")) {
    const db = new Database(databaseFile);
    const watcher = new OpenRouterAPIWatcher(db, logFile);
    watcher.runOnce();
    db.close();
    process.exit(0);
  } else {
    const db = new Database(databaseFile);
    const watcher = new OpenRouterAPIWatcher(db, logFile);
    const server = createServer(watcher);
    watcher.enterBackgroundMode();
    // db.close(); // Don't close the database here, as the background mode runs indefinitely
  }
}
