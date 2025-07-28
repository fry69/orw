// tests/helpers/test-factories.ts - Lightweight test factories
import type { Model, ModelDiff, WatcherStatus } from "../../lib/types.ts";
import { testModels } from "../fixtures/models.ts";
import { testChanges } from "../fixtures/changes.ts";

export interface MockWatcherConfig {
  models?: Model[];
  changes?: ModelDiff[];
  status?: Partial<WatcherStatus>;
}

export interface MockWatcherData {
  models: Model[];
  changes: ModelDiff[];
  status: WatcherStatus;
}

/**
 * Create mock watcher data without database dependencies
 */
export function createMockWatcherData(config: MockWatcherConfig = {}): MockWatcherData {
  const now = new Date().toISOString();
  const defaultStatus: WatcherStatus = {
    isDevelopment: false,
    apiLastCheck: now,
    apiLastCheckStatus: "success",
    dbLastChange: now,
  };

  return {
    models: config.models || testModels.slice(0, 3),
    changes: config.changes || testChanges.slice(0, 2),
    status: { ...defaultStatus, ...config.status },
  };
}

/**
 * Lightweight test data for quick tests
 */
export const testData = {
  minimal: createMockWatcherData({
    models: testModels.slice(0, 1),
    changes: testChanges.slice(0, 1),
  }),

  small: createMockWatcherData({
    models: testModels.slice(0, 3),
    changes: testChanges.slice(0, 2),
  }),

  large: createMockWatcherData({
    models: testModels,
    changes: testChanges,
  }),
};

/**
 * Create test request with common options
 */
export function createTestRequest(
  url: string = "http://localhost/",
  init: RequestInit = {},
): Request {
  return new Request(url, {
    method: "GET",
    ...init,
  });
}

/**
 * Assert response contains expected content
 */
export function assertResponseContent(response: Response, expected: {
  status?: number;
  headers?: Record<string, string>;
  contentType?: string;
}) {
  if (expected.status !== undefined) {
    if (response.status !== expected.status) {
      throw new Error(`Expected status ${expected.status}, got ${response.status}`);
    }
  }

  if (expected.contentType) {
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes(expected.contentType)) {
      throw new Error(
        `Expected content-type to include ${expected.contentType}, got ${contentType}`,
      );
    }
  }

  if (expected.headers) {
    for (const [key, value] of Object.entries(expected.headers)) {
      const actual = response.headers.get(key);
      if (actual !== value) {
        throw new Error(`Expected header ${key}: ${value}, got ${actual}`);
      }
    }
  }
}
