// watcher.ts - Simplified OpenRouter API watcher for Deno
import { Database } from "sqlite";
import { dirname, join } from "@std/path";
import { ensureDir } from "@std/fs";
import deepDiff from "deep-diff";
import type { Lists, Model, ModelChangeType, ModelDiff } from "../shared/global.ts";
import { runMigrations } from "./database.ts";
import { FETCH_TIMEOUT, OPENROUTER_API_URL } from "../shared/constants.ts";

export const isDevelopment = Deno.env.get("NODE_ENV") === "development" || false;
const dataDir = Deno.env.get("ORW_DATA_PATH") || "./data";

const defaultConfig = {
  dataDir,
  backupDir: Deno.env.get("ORW_BACKUP_PATH") || join(dataDir, "backup"),
  logFilePath: Deno.env.get("ORW_LOG_PATH") ?? join(dataDir, "orw.log"),
  dbFilePath: Deno.env.get("ORW_DB_PATH") ?? join(dataDir, "orw.db"),
  fixedModelList: undefined as Model[] | undefined,
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
 * Simplified OpenRouter API Watcher for Deno.
 */
export class OpenRouterAPIWatcher {
  private config: WatcherConfig;
  private status: WatcherStatus;
  private lists: Lists; // Memory cache for lists from database.

  /**
   * Creates a new instance of the OpenRouterAPIWatcher class.
   */
  constructor(config: WatcherConfig) {
    this.config = {
      ...defaultConfig,
      ...config,
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

    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist.
   */
  private async ensureDirectories() {
    if (this.config.logFilePath) {
      await ensureDir(dirname(this.config.logFilePath));
      // Check if the log file exists, if not, create it
      try {
        await Deno.stat(this.config.logFilePath);
      } catch {
        await Deno.writeTextFile(this.config.logFilePath, "");
      }
      if (isDevelopment) {
        this.log("watcher initialized");
      }
    }

    if (this.config.backupDir) {
      try {
        await ensureDir(this.config.backupDir);
      } catch (err) {
        const message = `Error creating backup directory at ${this.config.backupDir}: ${err}`;
        this.error(message);
        console.error(message);
        throw err;
      }
    }
  }

  /**
   * Get cached database lists
   */
  get getLists(): Lists {
    return this.lists;
  }

  /**
   * Get last change timestamp recorded in the database
   */
  get getDBLastChange(): Date {
    return this.status.dbLastChange;
  }

  /**
   * Get timestamp of the last OpenRouter API check
   */
  get getAPILastCheck(): Date {
    return this.status.apiLastCheck;
  }

  /**
   * Get status of the last OpenRouter API check result
   */
  get getAPILastCheckStatus(): string {
    return this.status.apiLastCheckStatus;
  }

  /**
   * Get the path to the current database backup file.
   */
  get getDbBackupPath(): string | undefined {
    if (this.config.backupDir && this.config.dbFilePath) {
      const basename = this.config.dbFilePath.split("/").pop() || "orw.db";
      return join(this.config.backupDir, basename + ".backup");
    }
    return undefined;
  }

  /**
   * Receives error messages and outputs to console and logfile
   */
  error(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] Error: ${message}`;

    console.error(logMessage);

    if (this.config.logFilePath) {
      Deno.writeTextFile(this.config.logFilePath, `${logMessage}\n`, { append: true });
    }
  }

  /**
   * Receives informational messages and outputs to console and logfile
   */
  log(message: string = "") {
    const timestamp = new Date().toISOString();
    let logMessage = ""; // just generate a newline by default, without timestamp
    if (message !== "") {
      logMessage = `[${timestamp}] ${message}`;
    }

    console.log(logMessage);

    if (this.config.logFilePath) {
      Deno.writeTextFile(this.config.logFilePath, `${logMessage}\n`, { append: true });
    }
  }

  /**
   * Fetches the current list of OpenRouter models from the API.
   */
  async getAPIModelList(): Promise<Model[]> {
    if (isDevelopment) {
      this.log(
        "Warning: using fixed model list, switch to production mode to load live model list from API",
      );
      return this.config.fixedModelList ?? [];
    }

    this.log("API check");
    this.status.apiLastCheck = new Date();

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });

      if (response.ok) {
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
      .map((row: Record<string, unknown>) => {
        const parsedData = JSON.parse(row.data as string);
        if (row.added_timestamp) {
          return { ...parsedData, added_at: row.added_timestamp };
        }
        return parsedData;
      });
    return models;
  }

  /**
   * Stores the current list of OpenRouter models in the SQLite database.
   */
  storeModelList(models: Model[], timestamp: Date = new Date()) {
    const deleteModels = this.config.db.prepare("DELETE FROM models");
    deleteModels.run();

    const insertModels = this.config.db.prepare(
      "INSERT INTO models (id, data, timestamp) VALUES (?, ?, ?)",
    );

    for (const model of models) {
      insertModels.run(model.id, JSON.stringify(model), timestamp.toISOString());
    }
  }

  /**
   * Loads list of removed OpenRouter models from the SQLite database.
   */
  loadRemovedModelList(): Model[] {
    const removedModels: Model[] = this.config.db
      .prepare("SELECT timestamp, data FROM removed_models ORDER BY timestamp DESC")
      .all()
      .map((row: Record<string, unknown>) => {
        const model: Model = JSON.parse(row.data as string);
        model.removed_at = row.timestamp as string;
        return model;
      });
    return removedModels;
  }

  /**
   * Stores a removed model from the OpenRouter models list in the SQLite database.
   */
  storeRemovedModel(model: Model, timestamp: Date = new Date()) {
    const insertModel = this.config.db.prepare(
      "INSERT INTO removed_models (id, data, timestamp) VALUES (?, ?, ?)",
    );
    insertModel.run(model.id, JSON.stringify(model), timestamp.toISOString());
  }

  /**
   * Loads the most recent model changes from the SQLite database.
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
   * Transform a row from the changes table to a ModelDiff object
   */
  private transformChangesRow = (row: Record<string, unknown>): ModelDiff => {
    const changes = JSON.parse(row.changes as string);
    if (row.type === "changed") {
      return {
        id: row.id as string,
        type: row.type as ModelChangeType,
        changes,
        timestamp: row.timestamp as string,
      };
    }
    return {
      id: row.id as string,
      type: row.type as ModelChangeType,
      model: changes,
      timestamp: row.timestamp as string,
    };
  };

  /**
   * Stores a list of model changes in the SQLite database.
   */
  storeChanges(changes: ModelDiff[]) {
    const insertChanges = this.config.db.prepare(
      "INSERT INTO changes (id, type, changes, timestamp) VALUES (?, ?, ?, ?)",
    );

    for (const change of changes) {
      insertChanges.run(
        change.id,
        change.type,
        change.changes ? JSON.stringify(change.changes) : JSON.stringify(change.model),
        change.timestamp,
      );
    }
  }

  /**
   * Stores an added model to the OpenRouter models list in the SQLite database.
   */
  storeAddedModel(model: Model, timestamp: Date = new Date()) {
    const insertAdded = this.config.db.prepare(
      "INSERT INTO added_models (id, data, timestamp) VALUES (?, ?, ?)",
    );
    insertAdded.run(model.id, JSON.stringify(model), timestamp.toISOString());
  }

  /**
   * Loads last API check timestamp and result status from database and updates internal status.
   */
  loadAPILastCheck() {
    const result: Record<string, unknown> | undefined = this.config.db
      .prepare("SELECT last_check, last_status FROM last_api_check WHERE id = 1")
      .get();

    if (result) {
      if (result.last_check) {
        this.status.apiLastCheck = new Date(result.last_check as string);
      } else {
        this.status.apiLastCheck = new Date(0);
      }
      this.status.apiLastCheckStatus = (result.last_status as string) ?? "unknown";
    }
  }

  /**
   * Updates the last check API timestamp and result status in the database.
   */
  updateAPILastCheck() {
    const replaceLastCheck = this.config.db.prepare(
      "INSERT OR REPLACE INTO last_api_check (id, last_check, last_status) VALUES (1, ?, ?);",
    );
    replaceLastCheck.run(this.status.apiLastCheck.toISOString(), this.status.apiLastCheckStatus);
  }

  /**
   * Finds the changes between a new list of models and the last stored list of models.
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
        const modelDiff = this.diffModels(newModel, oldModel);
        if (Object.keys(modelDiff.changes).length > 0) {
          changes.push({
            ...modelDiff,
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
   */
  private diffModels(
    newModel: Model,
    oldModel: Model,
  ): { changes: { [key: string]: { old: unknown; new: unknown } } } {
    const changes: { [key: string]: { old: unknown; new: unknown } } = {};
    const diffs = deepDiff.diff(oldModel, newModel);

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
        this.loadLists();
        this.status.dbLastChange = timestamp;
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
    } else {
      this.log("Rip in the spacetime continuum detected, proceeding anyway");
      await this.runBackgroundLoop();
    }
  }

  /**
   * Runs the OpenRouterAPIWatcher in query mode, displaying the most recent model changes.
   */
  public async runQueryMode(n: number = 10) {
    const changes = this.loadChanges(n);

    changes.forEach((change) => {
      if (change.type === "added") {
        console.log(`New model added with id ${change.id} at ${change.timestamp}`);
        console.dir(change.model);
      } else if (change.type === "removed") {
        console.log(`Model id ${change.id} removed at ${change.timestamp}`);
      } else if (change.type === "changed") {
        console.log(`Change detected for model ${change.id} at ${change.timestamp}:`);
        for (const [key, changeValue] of Object.entries(change.changes!)) {
          const { old, new: newValue } = changeValue as { old: unknown; new: unknown };
          console.log(`  ${key}: ${old} -> ${newValue}`);
        }
      }
      console.log();
    });
  }
}
