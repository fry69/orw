// watch-or.test.ts
import { describe, beforeEach, afterEach, test, expect, jest } from "bun:test";
import { OpenRouterModelWatcher } from "./watch-or";
import { Database } from "bun:sqlite";
import type { Model, ModelDiff } from "./types";

describe("OpenRouterModelWatcher", () => {
  let watcher: OpenRouterModelWatcher;
  let db: Database;

  beforeEach(() => {
    // Silence console output
    console.log = jest.fn();
    console.error = jest.fn();
    db = new Database(":memory:");
    watcher = new OpenRouterModelWatcher(db);
  });

  afterEach(() => {
    db.close();
  });

  test("should store and load model list", () => {
    const models: Model[] = [
      {
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
      },
    ];

    watcher.storeModelList(models, new Date());
    const loadedModels = watcher.loadLastModelList();

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
        timestamp: new Date(),
      },
    ];

    watcher.storeChanges(changes);
    const loadedChanges = watcher.loadChanges(1);

    expect(loadedChanges).toEqual(changes);
  });

  test("should find changes between model lists", () => {
    const oldModels: Model[] = [
      {
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
      },
    ];

    const newModels: Model[] = [
      {
        id: "1",
        name: "Model 1 Updated",
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
          instruct_type: "instruct",
        },
        top_provider: {
          max_completion_tokens: 2048,
          is_moderated: false,
        },
        per_request_limits: null,
      },
    ];

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
        timestamp: expect.any(Date),
      },
    ]);
  });

  test("should not report changes between identical model lists", () => {
    const oldModels: Model[] = [
      {
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
      },
    ];

    const newModels: Model[] = [
      {
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
      },
    ];

    const changes = watcher.findChanges(newModels, oldModels);

    expect(changes).toEqual([]);
  });

  test("should detect added models", () => {
    const oldModels: Model[] = [
      {
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
      },
    ];

    const newModels: Model[] = [
      {
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
      },
      {
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
      },
    ];

    const changes = watcher.findChanges(newModels, oldModels);

    expect(changes).toEqual([
      {
        id: "2",
        type: "added",
        model: newModels[1],
        timestamp: expect.any(Date),
      },
    ]);
  });

  test("should detect removed models", () => {
    const oldModels: Model[] = [
      {
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
      },
      {
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
      },
    ];

    const newModels: Model[] = [
      {
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
      },
    ];

    const changes = watcher.findChanges(newModels, oldModels);

    expect(changes).toEqual([
      {
        id: "2",
        type: "removed",
        model: oldModels[1],
        timestamp: expect.any(Date),
      },
    ]);
  });
});
