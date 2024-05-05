import { Database } from "bun:sqlite";
import { diff } from "deep-diff";

/**
 * Represents an OpenRouter model.
 */
export interface Model {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
    request: string;
    image: string;
  };
  context_length: number;
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_type: string | null;
  };
  top_provider: {
    max_completion_tokens: number | null;
    is_moderated: boolean;
  };
  per_request_limits: object | null;
}

/**
 * Represents a change in an OpenRouter model.
 */
export interface ModelDiff {
  id: string;
  changes: { [key: string]: { old: any; new: any } };
  timestamp: Date;
}

/**
 * Watches for changes in OpenRouter models and stores the changes in a SQLite database.
 */
export class OpenRouterModelWatcher {
  /**
   * The SQLite database used for storing model changes.
   */
  private db: Database;

  /**
   * A flag indicating whether the watcher is in the initial setup phase.
   */
  private initFlag: boolean = false;

  /**
   * Creates a new instance of the OpenRouterModelWatcher class.
   * @param db - The SQLite database to use for storing model changes.
   */
  constructor(db: Database) {
    this.db = db;
    this.createTablesIfNotExists();
  }

  /**
   * Creates the necessary tables in the SQLite database if they don't already exist.
   * Also seeds the database with the current model list if it's a fresh database.
   */
  createTablesIfNotExists() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY,
        data TEXT,
        timestamp TEXT
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS changes (
        id TEXT,
        changes TEXT,
        timestamp TEXT
      )
    `);

    // Seed the database with the current model list if it's a fresh database
    const lastModelList = this.loadLastModelList();
    if (lastModelList.length === 0) {
      this.initFlag = true;
      this.getModelList().then((newModels) => {
        this.storeModelList(newModels, new Date());
      });
    }
  }

  /**
   * Fetches the current list of OpenRouter models from the API.
   * @returns A Promise that resolves to an array of Model objects.
   */
  async getModelList(): Promise<Model[]> {
    const response = await fetch("https://openrouter.ai/api/v1/models");
    const { data } = await response.json();
    return data;
  }

  /**
   * Stores the current list of OpenRouter models in the SQLite database.
   * @param models - An array of Model objects to store.
   * @param timestamp - The timestamp to associate with the model list.
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
   * Stores a list of model changes in the SQLite database.
   * @param changes - An array of ModelDiff objects to store.
   */
  storeChanges(changes: ModelDiff[]) {
    for (const change of changes) {
      this.db.run(
        "INSERT INTO changes (id, changes, timestamp) VALUES (?, ?, ?)",
        [
          change.id,
          JSON.stringify(change.changes),
          change.timestamp.toISOString(),
        ]
      );
    }
  }

  /**
   * Loads the most recent list of OpenRouter models from the SQLite database.
   * @returns An array of Model objects.
   */
  loadLastModelList(): Model[] {
    return this.db
      .query("SELECT data FROM models")
      .all()
      .map((row: any) => JSON.parse(row.data));
  }

  /**
   * Loads the most recent model changes from the SQLite database.
   * @param n - The maximum number of changes to load.
   * @returns An array of ModelDiff objects.
   */
  loadChanges(n: number): ModelDiff[] {
    return this.db
      .query(
        "SELECT id, changes, timestamp FROM changes ORDER BY timestamp DESC LIMIT ?"
      )
      .all(n)
      .map((row: any) => ({
        id: row.id,
        changes: JSON.parse(row.changes),
        timestamp: new Date(row.timestamp),
      }));
  }

  /**
   * Finds the changes between a new list of models and the last stored list of models.
   * @param newModels - The new list of models.
   * @param oldModels - The last stored list of models.
   * @returns An array of ModelDiff objects representing the changes.
   */
  findChanges(newModels: Model[], oldModels: Model[]): ModelDiff[] {
    const changes: ModelDiff[] = [];

    for (const newModel of newModels) {
      const oldModel = oldModels.find((m) => m.id === newModel.id);
      if (oldModel) {
        const diff = this.diffModels(newModel, oldModel);
        if (Object.keys(diff.changes).length > 0) {
          changes.push({ ...diff, id: newModel.id, timestamp: new Date() });
        }
      } else {
        changes.push({ id: newModel.id, changes: {}, timestamp: new Date() });
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
   * Runs the OpenRouterModelWatcher in background mode, continuously checking for model changes.
   */
  public async runBackgroundMode() {
    while (true) {
      // skip check on initialization
      if (this.initFlag) {
        this.initFlag = false;
      } else {
        const newModels = await this.getModelList();
        const oldModels = this.loadLastModelList();
        const changes = this.findChanges(newModels, oldModels);

        if (changes.length > 0) {
          const timestamp = new Date();
          this.storeModelList(newModels, timestamp);
          this.storeChanges(changes);
          console.log("Changes detected:", changes);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 3600000)); // 1 hour
    }
  }

  /**
   * Runs the OpenRouterModelWatcher in query mode, displaying the most recent model changes.
   * @param n - The maximum number of changes to display.
   */
  public async runQueryMode(n: number = 10) {
    const changes = this.loadChanges(n);

    changes.forEach((change) => {
      console.log(`Change detected at ${change.timestamp.toLocaleString()}:`);
      for (const [key, { old, new: newValue }] of Object.entries(
        change.changes
      )) {
        console.log(`  ${key}: ${old} -> ${newValue}`);
      }
      console.log();
    });
  }
}

// Usage:
if (Bun.argv.includes("--query")) {
  const n = parseInt(Bun.argv[Bun.argv.indexOf("--query") + 1] || "10", 10);
  const db = new Database("openrouter.db");
  const watcher = new OpenRouterModelWatcher(db);
  watcher.runQueryMode(n);
  db.close();
} else {
  const db = new Database("openrouter.db");
  const watcher = new OpenRouterModelWatcher(db);
  watcher.runBackgroundMode();
  // db.close(); // Don't close the database here, as the background mode runs indefinitely
}
