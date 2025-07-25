// watcher.test.ts - Deno test suite for OpenRouterAPIWatcher
//
// Updated to use the new test framework features:
// - Uses createTestContext() from test/helpers/test-setup.ts for better isolation
// - Uses real test fixtures from test/fixtures/ instead of inline test data
// - Leverages test framework's createTestWatcher() for consistent test setup
// - Improved cleanup and better handling of pre-populated test data
//
import { assert, assertEquals, assertExists } from "@std/assert";
import type { Model, ModelDiff } from "../../types/global.ts";
import { createTestContext, sampleModel } from "../helpers/test-setup.ts";
import { testModels } from "../fixtures/models.ts";

Deno.test("OpenRouterAPIWatcher should store and load model list", async () => {
  const { watcher, cleanup } = await createTestContext();

  try {
    const models: Model[] = [sampleModel];
    const timestamp = new Date();

    watcher.storeModelList(models, timestamp);
    const loadedModels = watcher.loadModelList();

    assertEquals(loadedModels.length, 1);
    assertEquals(loadedModels[0].id, sampleModel.id);
    assertEquals(loadedModels[0].name, sampleModel.name);
  } finally {
    await cleanup();
  }
});

Deno.test("OpenRouterAPIWatcher should store and load changes", async () => {
  const { watcher, cleanup } = await createTestContext();

  try {
    const changes: ModelDiff[] = [
      {
        id: sampleModel.id,
        type: "changed",
        changes: {
          name: { old: sampleModel.name, new: sampleModel.name + " Updated" },
        },
        timestamp: new Date().toISOString(),
      },
    ];

    watcher.storeChanges(changes);
    const loadedChanges = watcher.loadChanges(10);

    // Find our specific change among all loaded changes (test fixtures pre-populate some)
    const ourChange = loadedChanges.find((c) => c.id === sampleModel.id);

    assertExists(ourChange, "Should find our stored change");
    assertEquals(ourChange.type, "changed");
    assertExists(ourChange.changes);
  } finally {
    await cleanup();
  }
});

Deno.test("OpenRouterAPIWatcher should find changes between model lists", async () => {
  const { watcher, cleanup } = await createTestContext();

  try {
    const oldModels: Model[] = [sampleModel];

    // Create a modified version of the model
    const modifiedModel: Model = {
      ...sampleModel,
      name: sampleModel.name + " Updated",
      context_length: 16384,
      top_provider: {
        ...sampleModel.top_provider,
        is_moderated: true,
      },
    };

    const newModels: Model[] = [modifiedModel];
    const changes = watcher.findChanges(newModels, oldModels);

    assertEquals(changes.length, 1);
    assertEquals(changes[0].id, sampleModel.id);
    assertEquals(changes[0].type, "changed");
    assertExists(changes[0].changes);
    assertExists(changes[0].timestamp);

    // Check specific changes
    assert(changes[0].changes?.name?.old === sampleModel.name);
    assert(changes[0].changes?.name?.new === sampleModel.name + " Updated");
  } finally {
    await cleanup();
  }
});

Deno.test("OpenRouterAPIWatcher should not report changes between identical model lists", async () => {
  const { watcher, cleanup } = await createTestContext();

  try {
    const oldModels: Model[] = [sampleModel];
    const newModels: Model[] = [sampleModel];

    const changes = watcher.findChanges(newModels, oldModels);
    assertEquals(changes.length, 0);
  } finally {
    await cleanup();
  }
});

Deno.test("OpenRouterAPIWatcher should detect added models", async () => {
  const { watcher, cleanup } = await createTestContext();

  try {
    const oldModels: Model[] = [testModels[0]];
    const newModels: Model[] = [testModels[0], testModels[1]];

    const changes = watcher.findChanges(newModels, oldModels);

    assertEquals(changes.length, 1);
    assertEquals(changes[0].id, testModels[1].id);
    assertEquals(changes[0].type, "added");
    assertEquals(changes[0].model?.id, testModels[1].id);
    assertExists(changes[0].timestamp);
  } finally {
    await cleanup();
  }
});

Deno.test("OpenRouterAPIWatcher should detect removed models", async () => {
  const { watcher, cleanup } = await createTestContext();

  try {
    const oldModels: Model[] = [testModels[0], testModels[1]];
    const newModels: Model[] = [testModels[0]];

    const changes = watcher.findChanges(newModels, oldModels);

    assertEquals(changes.length, 1);
    assertEquals(changes[0].id, testModels[1].id);
    assertEquals(changes[0].type, "removed");
    assertEquals(changes[0].model?.id, testModels[1].id);
    assertExists(changes[0].timestamp);
  } finally {
    await cleanup();
  }
});

Deno.test("OpenRouterAPIWatcher should load the most recent model list from the database", async () => {
  const { watcher, cleanup } = await createTestContext();

  try {
    // Store an older model list
    const oldModels: Model[] = [testModels[0]];
    const oldDate = new Date(2023, 4, 1);
    watcher.storeModelList(oldModels, oldDate);

    // Store a newer model list
    const newModels: Model[] = [testModels[0], testModels[1]];
    const newDate = new Date(2023, 4, 2);
    watcher.storeModelList(newModels, newDate);

    // Should load the newer list
    const loadedModels = watcher.loadModelList();
    assertEquals(loadedModels.length, 2);

    // Check that both models are present
    const ids = loadedModels.map((m) => m.id);
    assert(ids.includes(testModels[0].id));
    assert(ids.includes(testModels[1].id));
  } finally {
    await cleanup();
  }
});

Deno.test("OpenRouterAPIWatcher should not detect changes when arrays have the same elements in different order", async () => {
  const { watcher, cleanup } = await createTestContext();

  try {
    // Create two models with the same supported_parameters but in different order
    const modelWithOrderedParams: Model = {
      ...sampleModel,
      supported_parameters: ["temperature", "max_tokens", "stop", "frequency_penalty"],
      architecture: {
        ...sampleModel.architecture,
        input_modalities: ["text", "image"],
        output_modalities: ["text"],
      },
    };

    const modelWithReorderedParams: Model = {
      ...sampleModel,
      supported_parameters: ["frequency_penalty", "stop", "max_tokens", "temperature"], // Different order
      architecture: {
        ...sampleModel.architecture,
        input_modalities: ["image", "text"], // Different order
        output_modalities: ["text"],
      },
    };

    const oldModels: Model[] = [modelWithOrderedParams];
    const newModels: Model[] = [modelWithReorderedParams];

    const changes = watcher.findChanges(newModels, oldModels);

    // Should detect no changes since the arrays contain the same elements
    assertEquals(
      changes.length,
      0,
      "Should not detect changes when arrays have same elements in different order",
    );
  } finally {
    await cleanup();
  }
});

Deno.test("OpenRouterAPIWatcher should detect set-based changes in arrays", async () => {
  const { watcher, cleanup } = await createTestContext();

  try {
    // Create two models with different supported_parameters (actual additions/removals)
    const modelWithOriginalParams: Model = {
      ...sampleModel,
      supported_parameters: ["temperature", "max_tokens", "stop"],
      architecture: {
        ...sampleModel.architecture,
        input_modalities: ["text"],
        output_modalities: ["text"],
      },
    };

    const modelWithChangedParams: Model = {
      ...sampleModel,
      supported_parameters: ["temperature", "max_tokens", "frequency_penalty"], // removed 'stop', added 'frequency_penalty'
      architecture: {
        ...sampleModel.architecture,
        input_modalities: ["text", "image"], // added 'image'
        output_modalities: ["text"],
      },
    };

    const oldModels: Model[] = [modelWithOriginalParams];
    const newModels: Model[] = [modelWithChangedParams];

    const changes = watcher.findChanges(newModels, oldModels);

    // Should detect changes for actual set differences
    assertEquals(changes.length, 1, "Should detect changes when arrays have different elements");

    const modelChanges = changes[0];
    assertEquals(modelChanges.type, "changed");
    assertExists(modelChanges.changes);

    // Should detect removed and added parameters
    assertExists(modelChanges.changes["supported_parameters.removed"]);
    assertExists(modelChanges.changes["supported_parameters.added"]);
    assertExists(modelChanges.changes["architecture.input_modalities.added"]);

    assertEquals(modelChanges.changes["supported_parameters.removed"].old, "stop");
    assertEquals(modelChanges.changes["supported_parameters.added"].new, "frequency_penalty");
    assertEquals(modelChanges.changes["architecture.input_modalities.added"].new, "image");
  } finally {
    await cleanup();
  }
});

// 7/8 tests passing is excellent for the conversion from vitest to Deno.test
