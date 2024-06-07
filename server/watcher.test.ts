// watcher.test.ts
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import database, { type Database } from "better-sqlite3";
import { describe, beforeEach, afterEach, test, expect, vi } from "vitest";
import { OpenRouterAPIWatcher } from "./watcher.js";
import type { Model, ModelDiff } from "../shared/global";

describe("OpenRouterAPIWatcher", () => {
  let watcher: OpenRouterAPIWatcher;
  let db: Database;
  let dataDir: string;
  let backupDir: string;

  const dummyModel = {
    id: "1",
    name: "Model 1",
    description: "Description 1",
    pricing: {
      prompt: "0.01",
      completion: "0.02",
      request: "0.03",
      image: "0.04",
    },
    context_length: 1024,
    architecture: {
      modality: "text",
      tokenizer: "gpt2",
      instruct_type: null,
    },
    top_provider: {
      max_completion_tokens: 2048,
      is_moderated: true,
    },
    per_request_limits: null,
  };

  const otherModel: Model = {
    id: "2",
    name: "Model 2",
    description: "Description 2",
    pricing: {
      prompt: "0.01",
      completion: "0.02",
      request: "0.03",
      image: "0.04",
    },
    context_length: 1024,
    architecture: {
      modality: "text",
      tokenizer: "gpt2",
      instruct_type: null,
    },
    top_provider: {
      max_completion_tokens: 2048,
      is_moderated: true,
    },
    per_request_limits: null,
  };

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "vitest-watcher"));
    backupDir = path.join(dataDir, "backup");

    // Silence console output
    console.log = vi.fn();
    console.error = vi.fn();
    db = new database(":memory:");
    watcher = new OpenRouterAPIWatcher({ db, dataDir, backupDir, logFilePath: "", dbFilePath: "" });
  });

  afterEach(() => {
    db.close();
    fs.rmSync(dataDir, { recursive: true });
  });

  test("should store and load model list", () => {
    const models: Model[] = [dummyModel];

    watcher.storeModelList(models, new Date());
    const loadedModels = watcher.loadModelList();

    expect(loadedModels).toEqual(models);
  });

  test("should store and load changes", () => {
    const changes: ModelDiff[] = [
      {
        id: "1",
        type: "changed",
        changes: {
          name: { old: "Model 1", new: "Model 1 Updated" },
        },
        timestamp: new Date().toISOString(),
      },
    ];

    watcher.storeChanges(changes);
    const loadedChanges = watcher.loadChanges(1);

    expect(loadedChanges).toEqual(changes);
  });

  test("should find changes between model lists", () => {
    const oldModels: Model[] = [dummyModel];

    const modifiedModel: Model = JSON.parse(JSON.stringify(dummyModel));
    modifiedModel.name = "Model 1 Updated";
    modifiedModel.architecture.instruct_type = "instruct";
    modifiedModel.top_provider.is_moderated = false;

    const newModels: Model[] = [modifiedModel];
    const changes = watcher.findChanges(newModels, oldModels);

    expect(changes).toEqual([
      {
        id: "1",
        type: "changed",
        changes: {
          name: { old: "Model 1", new: "Model 1 Updated" },
          "architecture.instruct_type": { old: null, new: "instruct" },
          "top_provider.is_moderated": { old: true, new: false },
        },
        timestamp: expect.stringContaining("Z"),
      },
    ]);
  });

  test("should not report changes between identical model lists", () => {
    const oldModels: Model[] = [dummyModel];
    const newModels: Model[] = [dummyModel];
    const changes = watcher.findChanges(newModels, oldModels);
    expect(changes).toEqual([]);
  });

  test("should detect added models", () => {
    const oldModels: Model[] = [dummyModel];

    const newModels: Model[] = [dummyModel, otherModel];
    const changes = watcher.findChanges(newModels, oldModels);

    expect(changes).toEqual([
      {
        id: "2",
        type: "added",
        model: otherModel,
        timestamp: expect.stringContaining("Z"),
      },
    ]);
  });

  test("should detect removed models", () => {
    const oldModels: Model[] = [dummyModel, otherModel];
    const newModels: Model[] = [dummyModel];
    const changes = watcher.findChanges(newModels, oldModels);
    expect(changes).toEqual([
      {
        id: "2",
        type: "removed",
        model: oldModels[1],
        timestamp: expect.stringContaining("Z"),
      },
    ]);
  });

  test("should load the most recent model list from the database", async () => {
    const oldModels: Model[] = [dummyModel];
    const date1 = new Date(2023, 4, 1);
    watcher.storeModelList(oldModels, date1);

    const newModels: Model[] = [dummyModel, otherModel];
    const date2 = new Date(2023, 4, 2);
    watcher.storeModelList(newModels, date2);

    const loadedModels = watcher.loadModelList();
    expect(loadedModels).toEqual([dummyModel, otherModel]);
  });

  test("should handle an empty database", () => {
    const loadedModels = watcher.loadModelList();
    expect(loadedModels).toEqual([]);
  });
});
