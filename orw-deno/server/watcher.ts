// watcher.ts - Simplified OpenRouter API watcher for Deno
import type { DatabaseSync } from "sqlite";
import { dirname, join } from "@std/path";
import { ensureDir } from "@std/fs";
import deepDiff from "deep-diff";
import type { Lists, Model, ModelChangeType, ModelDiff } from "../lib/types.ts";
import { FETCH_TIMEOUT_MS, OPENROUTER_API_URL, WATCHER_INTERVAL_MS } from "../lib/constants.ts";

const isDevelopment = Deno.env.get("NODE_ENV") === "development" ||
  Deno.env.get("NODE_ENV") === "test" || false;

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
  db?: DatabaseSync;
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
  constructor(config: Partial<typeof defaultConfig>) {
    this.config = { ...defaultConfig, ...config };

    this.status = {
      apiLastCheck: new Date(0),
      apiLastCheckStatus: "unknown",
      dbLastChange: new Date(0),
    };

    this.lists = {
      models: [],
      changes: [],
      removed: [],
    };

    // Don't do any async operations in constructor
    this.ensureDirectories();
  }

  /**
   * Initialize the watcher instance
   */
  async initialize(options: { seed?: boolean; skipAPI?: boolean } = {}) {
    // Only load lists and last check timestamp if database has data (tables exist and are populated)
    if (this.config.db && this.databaseHasData()) {
      this.loadAPILastCheck();
      this.loadLists();

      // Update status with last change timestamp
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

    if (options.seed && this.lists.models.length === 0 && !options.skipAPI) {
      // Seed the database with the current model list if it's a fresh database
      this.log("empty model list in database, seeding...");

      const newModels = await this.getAPIModelList();
      if (newModels.length > 0) {
        this.status.apiLastCheckStatus = "success";
        this.updateAPILastCheck();
        this.lists.models = newModels;
        this.status.dbLastChange = new Date();
        this.storeModelList(newModels, this.status.dbLastChange);
        this.log("seeded database with model list from API");
      }
    }
  }

  // =============================================================================
  // Private Database Helper Methods
  // =============================================================================

  /**
   * Check if database has data (models table exists and has data)
   */
  private databaseHasData(): boolean {
    if (!this.hasDatabase()) {
      return false;
    }

    try {
      // Try to count models - if this works, the table exists
      const result = this.config.db!.prepare("SELECT COUNT(*) as count FROM models").get() as {
        count: number;
      };
      return result.count > 0;
    } catch {
      // Table doesn't exist or query failed
      return false;
    }
  }

  /**
   * Check if database is available
   */
  private hasDatabase(): boolean {
    return this.config.db !== undefined;
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

  // =============================================================================
  // Core Getter Methods
  // =============================================================================

  /**
   * Get all cached database lists
   */
  get allLists(): Lists {
    return this.lists;
  }

  /**
   * Get current watcher status including timestamps and API check results
   */
  get watcherStatus(): Readonly<WatcherStatus> {
    return this.status;
  }

  /**
   * Get the path to the current database backup file
   */
  // get dbBackupPath(): string | undefined {
  //   if (this.config.backupDir && this.config.dbFilePath) {
  //     const basename = this.config.dbFilePath.split("/").pop() || "orw.db";
  //     return join(this.config.backupDir, basename + ".backup");
  //   }
  //   return undefined;
  // }

  /**
   * Get current models list
   */
  // get models(): Model[] {
  //   return this.lists.models;
  // }

  /**
   * Get current changes list
   */
  // get changes(): ModelDiff[] {
  //   return this.lists.changes;
  // }

  /**
   * Get current removed models list
   */
  // get removedModels(): Model[] {
  //   return this.lists.removed;
  // }

  // =============================================================================
  // Status and Health Check Methods
  // =============================================================================

  /**
   * Check if the watcher is ready to perform operations
   */
  // get isReady(): boolean {
  //   return this.hasDatabase() && this.databaseHasData();
  // }

  /**
   * Check if we're currently in development mode
   */
  // get isDevelopmentMode(): boolean {
  //   return isDevelopment;
  // }

  /**
   * Check if the last API check was successful
   */
  // get lastAPICheckSuccessful(): boolean {
  //   return this.status.apiLastCheckStatus === "success";
  // }

  /**
   * Get time since last API check in milliseconds
   */
  // get timeSinceLastAPICheck(): number {
  //   return Date.now() - this.status.apiLastCheck.getTime();
  // }

  /**
   * Check if it's time for the next API check (more than 1 hour ago)
   */
  // get shouldCheckAPI(): boolean {
  //   return this.timeSinceLastAPICheck > CHECK_INTERVAL_MS
  // }

  // =============================================================================
  // Logging and Error Handling Methods
  // =============================================================================

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

  // =============================================================================
  // API Communication Methods
  // =============================================================================

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
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
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

  // =============================================================================
  // Database Operations - Data Loading
  // =============================================================================

  /**
   * Loads last API check timestamp and result status from database and updates internal status.
   */
  loadAPILastCheck() {
    if (!this.hasDatabase()) {
      return;
    }

    const result: Record<string, unknown> | undefined = this.config.db!
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
   * Loads all relevant lists from database.
   */
  loadLists() {
    if (!this.hasDatabase()) {
      this.log("No database available, using empty lists");
      return;
    }
    this.lists.models = this.loadModelList();
    this.lists.removed = this.loadRemovedModelList();
    this.lists.changes = this.loadChanges();

    // Log database contents summary
    console.log(
      `Database loaded: ${this.lists.models.length} models, ${this.lists.changes.length} changes, ${this.lists.removed.length} removed`,
    );
  }

  /**
   * Loads the most recent list of OpenRouter models from the SQLite database.
   */
  loadModelList(): Model[] {
    if (!this.hasDatabase()) {
      return [];
    }

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

    const models: Model[] = this.config.db!
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
   * Loads list of removed OpenRouter models from the SQLite database.
   */
  loadRemovedModelList(): Model[] {
    if (!this.hasDatabase()) {
      return [];
    }

    const removedModels: Model[] = this.config.db!
      .prepare("SELECT timestamp, data FROM removed_models ORDER BY timestamp DESC")
      .all()
      .map((row: Record<string, unknown>) => {
        try {
          const dataStr = row.data as string;
          if (!dataStr || dataStr === "null") {
            console.warn(`Skipping removed model with invalid data: ${dataStr}`);
            return null;
          }

          const model: Model = JSON.parse(dataStr);
          if (!model || typeof model !== "object") {
            console.warn(`Skipping removed model with invalid parsed data: ${model}`);
            return null;
          }

          model.removed_at = row.timestamp as string;
          return model;
        } catch (error) {
          console.warn(`Error parsing removed model data: ${error}, row:`, row);
          return null;
        }
      })
      .filter((model: Model): model is Model => model !== null);

    return removedModels;
  }

  /**
   * Loads the most recent model changes from the SQLite database.
   */
  loadChanges(n?: number): ModelDiff[] {
    /**
     * Helper method for transforming a row from the changes table to a ModelDiff object
     */
    function transformChangesRow(row: Record<string, unknown>): ModelDiff {
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
    }

    if (!this.hasDatabase()) {
      return [];
    }

    if (n) {
      return this.config.db!
        .prepare("SELECT id, type, changes, timestamp FROM changes ORDER BY timestamp DESC LIMIT ?")
        .all(n)
        .map(transformChangesRow);
    } else {
      return this.config.db!
        .prepare("SELECT id, type, changes, timestamp FROM changes ORDER BY timestamp DESC")
        .all()
        .map(transformChangesRow);
    }
  }

  // =============================================================================
  // Database Operations - Data Storage
  // =============================================================================

  /**
   * Stores the current list of OpenRouter models in the SQLite database.
   */
  storeModelList(models: Model[], timestamp: Date = new Date()) {
    if (!this.hasDatabase()) {
      this.log("No database available, cannot store model list");
      return;
    }

    const deleteModels = this.config.db!.prepare("DELETE FROM models");
    deleteModels.run();

    const insertModels = this.config.db!.prepare(
      "INSERT INTO models (id, data, timestamp) VALUES (?, ?, ?)",
    );

    for (const model of models) {
      insertModels.run(model.id, JSON.stringify(model), timestamp.toISOString());
    }
  }

  /**
   * Stores a removed model from the OpenRouter models list in the SQLite database.
   */
  storeRemovedModel(model: Model, timestamp: Date = new Date()) {
    if (!this.hasDatabase()) {
      this.log("No database available, cannot store removed model");
      return;
    }

    const insertModel = this.config.db!.prepare(
      "INSERT INTO removed_models (id, data, timestamp) VALUES (?, ?, ?)",
    );
    insertModel.run(model.id, JSON.stringify(model), timestamp.toISOString());
  }

  /**
   * Stores a list of model changes in the SQLite database.
   */
  storeChanges(changes: ModelDiff[]) {
    if (!this.hasDatabase()) {
      this.log("No database available, cannot store changes");
      return;
    }

    const insertChanges = this.config.db!.prepare(
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
    if (!this.hasDatabase()) {
      this.log("No database available, cannot store added model");
      return;
    }

    const insertAdded = this.config.db!.prepare(
      "INSERT INTO added_models (id, data, timestamp) VALUES (?, ?, ?)",
    );
    insertAdded.run(model.id, JSON.stringify(model), timestamp.toISOString());
  }

  /**
   * Updates the last check API timestamp and result status in the database.
   */
  updateAPILastCheck() {
    if (!this.hasDatabase()) {
      return;
    }

    const replaceLastCheck = this.config.db!.prepare(
      "INSERT OR REPLACE INTO last_api_check (id, last_check, last_status) VALUES (1, ?, ?);",
    );
    replaceLastCheck.run(this.status.apiLastCheck.toISOString(), this.status.apiLastCheckStatus);
  }

  // =============================================================================
  // Change Detection and Model Diffing
  // =============================================================================

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
   * Computes set-based differences for arrays that should be treated as sets.
   * Returns meaningful additions/removals instead of array index changes.
   */
  private computeSetDifferences(
    oldArray: unknown[] | undefined,
    newArray: unknown[] | undefined,
    fieldPath: string,
  ): { [key: string]: { old: unknown; new: unknown } } {
    const changes: { [key: string]: { old: unknown; new: unknown } } = {};

    if (!oldArray && !newArray) return changes;

    const oldSet = new Set(oldArray || []);
    const newSet = new Set(newArray || []);

    // Find elements that were removed
    const removed = [...oldSet].filter((item) => !newSet.has(item));
    if (removed.length > 0) {
      changes[`${fieldPath}.removed`] = {
        old: removed.length === 1 ? removed[0] : removed,
        new: null,
      };
    }

    // Find elements that were added
    const added = [...newSet].filter((item) => !oldSet.has(item));
    if (added.length > 0) {
      changes[`${fieldPath}.added`] = {
        old: null,
        new: added.length === 1 ? added[0] : added,
      };
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

    // First, handle set-based arrays that should not be compared element-by-element
    const setArrayFields = [
      {
        path: "supported_parameters",
        oldValue: oldModel.supported_parameters,
        newValue: newModel.supported_parameters,
      },
      {
        path: "architecture.input_modalities",
        oldValue: oldModel.architecture?.input_modalities,
        newValue: newModel.architecture?.input_modalities,
      },
      {
        path: "architecture.output_modalities",
        oldValue: oldModel.architecture?.output_modalities,
        newValue: newModel.architecture?.output_modalities,
      },
    ];

    for (const field of setArrayFields) {
      const setChanges = this.computeSetDifferences(field.oldValue, field.newValue, field.path);
      Object.assign(changes, setChanges);
    }

    // Use deep-diff for all other field comparisons
    const diffs = deepDiff.diff(oldModel, newModel);

    if (diffs) {
      for (const d of diffs) {
        if (d.kind === "E") {
          if (d.path) {
            const pathStr = d.path.join(".");

            // Skip set-based array fields that we already handled
            const isSetArrayField = setArrayFields.some((field) =>
              pathStr.startsWith(field.path) && pathStr.includes(".")
            );

            if (!isSetArrayField) {
              changes[pathStr] = { old: d.lhs, new: d.rhs };
            }
          }
        }
      }
    }

    return { changes };
  }

  // =============================================================================
  // Main Control Flow and Public API Methods
  // =============================================================================

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
      await new Promise((resolve) => setTimeout(resolve, WATCHER_INTERVAL_MS));
    }
  }

  /**
   * Prepares the OpenRouterAPIWatcher for background mode.
   */
  public async enterBackgroundMode() {
    this.log("Watcher running in background mode");

    // Check the last API timestamp and check if it is older than one hour
    const timeDiff = Date.now() - this.status.apiLastCheck.getTime();

    // schedule the next API check after the remaining wait time has elapsed
    const sleeptime = WATCHER_INTERVAL_MS - timeDiff;
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
  public runQueryMode(n: number = 10) {
    // Ensure we have data before querying
    if (!this.hasDatabase() || !this.databaseHasData()) {
      console.log("No data available. Run --init first to initialize the database.");
      return;
    }

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
