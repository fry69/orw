// watcher.test.ts
import { join } from "@std/path";
import { assertEquals, assertExists } from "@std/assert";
import { Database } from "sqlite";
import { OpenRouterAPIWatcher } from "./watcher.ts";
import { runMigrations } from "./database.ts";
import type { Model, ModelDiff } from "../shared/global.ts";

const dummyModel: Model = {
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

function createTestWatcher(): { watcher: OpenRouterAPIWatcher; cleanup: () => void } {
  // Set development environment to use fixed model list
  Deno.env.set("NODE_ENV", "development");

  // Create test database path
  const testDbPath = join(Deno.cwd(), "test_watcher.db");

  // Set up database with migrations
  const db = new Database(testDbPath);
  runMigrations(db);

  // Create a fixed model list to prevent API calls
  const fixedModels: Model[] = [
    {
      id: "test-model-1",
      name: "Test Model 1",
      pricing: {
        completion: "0.001",
        prompt: "0.0005",
        request: "0.0001",
        image: "0.0002"
      },
      context_length: 8192,
      description: "First test model",
      architecture: {
        modality: "text",
        tokenizer: "test-tokenizer",
        instruct_type: "test-instruct"
      },
      top_provider: {
        max_completion_tokens: 4096,
        is_moderated: false
      },
      per_request_limits: null
    },
    {
      id: "test-model-2",
      name: "Test Model 2",
      pricing: {
        completion: "0.002",
        prompt: "0.001",
        request: "0.0002",
        image: "0.0004"
      },
      context_length: 4096,
      description: "Second test model",
      architecture: {
        modality: "text",
        tokenizer: "test-tokenizer-2",
        instruct_type: null
      },
      top_provider: {
        max_completion_tokens: 2048,
        is_moderated: true
      },
      per_request_limits: {}
    }
  ];

  // Pre-populate database to prevent seeding logic
  for (const model of fixedModels) {
    db.exec(`
      INSERT INTO models (id, data, timestamp)
      VALUES (?, ?, datetime('now'))
    `, [model.id, JSON.stringify(model)]);
  }

  // Create watcher config with fixed model list to prevent API calls
  const config = {
    db,
    dataDir: "./test_data",
    dbFilePath: testDbPath,
    fixedModelList: fixedModels
  };

  // Now create the watcher with fixed model list
  const watcher = new OpenRouterAPIWatcher(config);

  // Return watcher and cleanup function
  return {
    watcher,
    cleanup: () => {
      try {
        db.close();
        try {
          Deno.removeSync(testDbPath);
        } catch {
          // Ignore if file doesn't exist
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  };
}

Deno.test("OpenRouterAPIWatcher should store and load model list", () => {
  const { watcher, cleanup } = createTestWatcher();
  try {
    const models: Model[] = [dummyModel];

    watcher.storeModelList(models, new Date());
    const loadedModels = watcher.loadModelList();

    assertEquals(loadedModels, models);
  } finally {
    cleanup();
  }
});

Deno.test("OpenRouterAPIWatcher should store and load changes", () => {
  const { watcher, cleanup } = createTestWatcher();
  try {
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

    assertEquals(loadedChanges, changes);
  } finally {
    cleanup();
  }
});

Deno.test("OpenRouterAPIWatcher should find changes between model lists", () => {
  const { watcher, cleanup } = createTestWatcher();
  try {
    const oldModels: Model[] = [dummyModel];

    const modifiedModel: Model = JSON.parse(JSON.stringify(dummyModel));
    modifiedModel.name = "Model 1 Updated";
    modifiedModel.architecture.instruct_type = "instruct";
    modifiedModel.top_provider.is_moderated = false;

    const newModels: Model[] = [modifiedModel];
    const changes = watcher.findChanges(newModels, oldModels);

    assertEquals(changes.length, 1);
    assertEquals(changes[0].id, "1");
    assertEquals(changes[0].type, "changed");
    assertEquals(changes[0].changes?.name, { old: "Model 1", new: "Model 1 Updated" });
    assertEquals(changes[0].changes?.["architecture.instruct_type"], { old: null, new: "instruct" });
    assertEquals(changes[0].changes?.["top_provider.is_moderated"], { old: true, new: false });
    assertExists(changes[0].timestamp);
  } finally {
    cleanup();
  }
});

Deno.test("OpenRouterAPIWatcher should not report changes between identical model lists", () => {
  const { watcher, cleanup } = createTestWatcher();
  try {
    const oldModels: Model[] = [dummyModel];
    const newModels: Model[] = [dummyModel];
    const changes = watcher.findChanges(newModels, oldModels);
    assertEquals(changes, []);
  } finally {
    cleanup();
  }
});

Deno.test("OpenRouterAPIWatcher should detect added models", () => {
  const { watcher, cleanup } = createTestWatcher();
  try {
    const oldModels: Model[] = [dummyModel];
    const newModels: Model[] = [dummyModel, otherModel];
    const changes = watcher.findChanges(newModels, oldModels);

    assertEquals(changes.length, 1);
    assertEquals(changes[0].id, "2");
    assertEquals(changes[0].type, "added");
    assertEquals(changes[0].model, otherModel);
    assertExists(changes[0].timestamp);
  } finally {
    cleanup();
  }
});

Deno.test("OpenRouterAPIWatcher should detect removed models", () => {
  const { watcher, cleanup } = createTestWatcher();
  try {
    const oldModels: Model[] = [dummyModel, otherModel];
    const newModels: Model[] = [dummyModel];
    const changes = watcher.findChanges(newModels, oldModels);

    assertEquals(changes.length, 1);
    assertEquals(changes[0].id, "2");
    assertEquals(changes[0].type, "removed");
    assertEquals(changes[0].model, oldModels[1]);
    assertExists(changes[0].timestamp);
  } finally {
    cleanup();
  }
});

Deno.test("OpenRouterAPIWatcher should load the most recent model list from the database", () => {
  const { watcher, cleanup } = createTestWatcher();
  try {
    const oldModels: Model[] = [dummyModel];
    const date1 = new Date(2023, 4, 1);
    watcher.storeModelList(oldModels, date1);

    const newModels: Model[] = [dummyModel, otherModel];
    const date2 = new Date(2023, 4, 2);
    watcher.storeModelList(newModels, date2);

    const loadedModels = watcher.loadModelList();
    assertEquals(loadedModels, [dummyModel, otherModel]);
  } finally {
    cleanup();
  }
});

Deno.test("OpenRouterAPIWatcher should handle an empty database", () => {
  // For this test, we need a truly empty database, so we create a separate setup
  const dataDir = Deno.makeTempDirSync({ prefix: "deno-watcher-empty-test" });
  const backupDir = join(dataDir, "backup");

  const originalLog = console.log;
  const originalError = console.error;
  const originalEnv = Deno.env.get("NODE_ENV");

  // Set development mode and silence console
  Deno.env.set("NODE_ENV", "development");
  console.log = () => {};
  console.error = () => {};

  const db = new Database(":memory:");

  try {
    // Even for empty database test, provide a fixed model list to prevent API calls
    const fixedModels: Model[] = [
      {
        id: "empty-test-model",
        name: "Empty Test Model",
        pricing: {
          completion: "0.001",
          prompt: "0.0005",
          request: "0.0001",
          image: "0.0002"
        },
        context_length: 8192,
        description: "Model for empty database test",
        architecture: {
          modality: "text",
          tokenizer: "test-tokenizer",
          instruct_type: "test-instruct"
        },
        top_provider: {
          max_completion_tokens: 4096,
          is_moderated: false
        },
        per_request_limits: null
      }
    ];

    const watcher = new OpenRouterAPIWatcher({
      db,
      dataDir,
      backupDir,
      logFilePath: "",
      dbFilePath: "",
      fixedModelList: fixedModels
    });

    // The database should be empty initially, but watcher should handle it gracefully
    const initialModels = watcher.loadModelList();
    assertEquals(initialModels, []);

    // Check API status
    const apiStatus = watcher.getAPILastCheckStatus;
    assertExists(apiStatus);
    assertEquals(apiStatus, "unknown");
  } finally {
    // Restore original settings
    console.log = originalLog;
    console.error = originalError;
    if (originalEnv) {
      Deno.env.set("NODE_ENV", originalEnv);
    } else {
      Deno.env.delete("NODE_ENV");
    }

    try {
      db.close();
    } catch {
      // Ignore close errors
    }

    try {
      Deno.removeSync(dataDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  }
});
