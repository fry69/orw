# Testing Strategy Design Document

## Current State Analysis

### Problems with Current Testing Approach

The current test setup has several significant issues:

1. **Full Server Startup for Every Test**: `createTestServerContext()` starts a complete HTTP server, which is slow and resource-intensive
2. **Heavy Database Setup**: Every test creates a temporary database, runs migrations, and populates test data
3. **Complex Cleanup**: Each test requires extensive cleanup of servers, databases, and temporary files
4. **Slow Test Execution**: Integration-style tests for simple unit-level functionality
5. **Resource Leaks**: Tests require `sanitizeResources: false` and `sanitizeOps: false`

### Current Test Categories

Based on analysis of existing tests:

1. **Pure Unit Tests** (already good):
   - `lib/utils.test.ts` - Pure functions, no dependencies
   - `islands/ChangeList.test.ts` - Component utility functions

2. **Route Handler Tests** (unnecessarily heavy):
   - `routes/index.test.ts` - Simple redirect logic
   - `routes/middleware.test.ts` - Middleware behavior
   - `routes/app.test.ts` - Layout rendering
   - `routes/pages.test.ts` - Page rendering
   - `routes/rss.test.ts` - RSS feed generation
   - `routes/error.test.ts` - Error handling

3. **Integration Tests** (appropriately heavy):
   - `routes/integration.test.ts` - Full application flow
   - `server/watcher.test.ts` - Watcher functionality

## Fresh Testing Best Practices

Based on Fresh documentation analysis, the recommended approach is:

### 1. Handler Testing Pattern
```typescript
const handler = new App()
  .use(middleware)
  .get("/", (ctx) => new Response("hello"))
  .handler();

const response = await handler(new Request("http://localhost"));
```

### 2. Builder Pattern for File Routes
```typescript
const builder = new Builder();
const applySnapshot = await builder.build({ snapshot: "memory" });

function testApp() {
  const app = new App().fsRoutes();
  applySnapshot(app); // Apply file routes
  return app;
}
```

### 3. Isolated Testing
- Test individual middlewares in isolation
- Test route handlers without full server startup
- Use memory snapshots for file route testing

## Proposed Testing Strategy

### Test Categorization

#### Level 1: Pure Unit Tests (No Changes Needed)
- **Target**: Pure functions, utilities, type definitions
- **Approach**: Direct function calls, no mocking needed
- **Examples**: `lib/utils.test.ts`, component utility functions
- **Runtime**: < 10ms per test

#### Level 2: Handler Unit Tests (Major Refactor)
- **Target**: Individual route handlers, middleware functions
- **Approach**: Fresh's handler testing pattern
- **Setup**: Minimal app instance with specific handler
- **Examples**: Redirect logic, middleware behavior, API endpoints
- **Runtime**: < 50ms per test

#### Level 3: Integrated Handler Tests (Moderate Refactor)
- **Target**: Routes that need file system routes + database
- **Approach**: Builder pattern with in-memory database
- **Setup**: Snapshot build + lightweight database mock
- **Examples**: Full page rendering with data
- **Runtime**: < 200ms per test

#### Level 4: Integration Tests (Minor Changes)
- **Target**: Full application workflows, external dependencies
- **Approach**: Current approach but only for true integration tests
- **Setup**: Full server startup with real database
- **Examples**: End-to-end user flows, API integration
- **Runtime**: < 2s per test

### Implementation Strategy

#### Phase 1: Extract Test Utilities

Create lightweight test utilities:

```typescript
// tests/helpers/test-factories.ts
export interface MockWatcherConfig {
  models?: Model[];
  changes?: ModelDiff[];
  status?: WatcherStatus;
}

export function createMockWatcher(config: MockWatcherConfig = {}): OpenRouterAPIWatcher {
  // Return lightweight mock without database
}

export function createMockDatabase(data: TestData = {}): DatabaseSync {
  // Return in-memory SQLite database
}
```

#### Phase 2: Convert Handler Tests

Transform route tests to use Fresh's handler pattern:

```typescript
// Before (heavy)
const serverContext = await createTestServerContext({...});
const response = await fetch(`${serverContext.baseUrl}/`);
await serverContext.shutdown();

// After (lightweight)
const handler = new App()
  .get("/", () => new Response("", { status: 302, headers: { Location: "/changes" }}))
  .handler();
const response = await handler(new Request("http://localhost/"));
```

#### Phase 3: Convert Integrated Tests

Use Builder pattern for tests requiring file routes:

```typescript
// tests/helpers/app-factory.ts
const builder = new Builder();
const applySnapshot = await builder.build({ snapshot: "memory" });

export function createTestApp(config: TestAppConfig = {}) {
  const app = new App<State>()
    .use(createMockMiddleware(config.mockData))
    .fsRoutes();

  applySnapshot(app);
  return app;
}
```

#### Phase 4: Optimize Integration Tests

Keep full server tests only where necessary and optimize:

```typescript
// Only for true integration tests
export async function createIntegrationTestServer(config: IntegrationConfig) {
  // Minimal setup, reuse database between tests where possible
}
```

## Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Create `tests/helpers/test-factories.ts` with lightweight mocks
- [ ] Create `tests/helpers/app-factory.ts` with Builder pattern setup
- [ ] Add `tests/helpers/mock-database.ts` for in-memory test database
- [ ] Update `tests/helpers/test-setup.ts` to include new utilities

### Phase 2: Handler Conversion (Week 2)
- [ ] Convert `routes/index.test.ts` to handler pattern (simple redirect)
- [ ] Convert `routes/middleware.test.ts` to isolated middleware testing
- [ ] Convert `routes/error.test.ts` to handler pattern
- [ ] Convert `routes/rss.test.ts` to handler pattern with mock data

### Phase 3: Integrated Conversion (Week 3)
- [ ] Convert `routes/app.test.ts` to Builder pattern
- [ ] Convert `routes/pages.test.ts` to Builder pattern
- [ ] Update `server/watcher.test.ts` to use mock database
- [ ] Create shared test database utilities

### Phase 4: Integration Optimization (Week 4)
- [ ] Optimize `routes/integration.test.ts` to reuse setup
- [ ] Add database seeding utilities for integration tests
- [ ] Create test database migration utilities
- [ ] Add performance benchmarks for test suite

### Phase 5: Cleanup and Documentation (Week 5)
- [ ] Remove old heavy test utilities
- [ ] Update all tests to remove `sanitizeResources: false`
- [ ] Add test strategy documentation
- [ ] Add example test patterns for new features

## Expected Performance Improvements

| Test Category | Current Runtime | Target Runtime | Improvement |
|---------------|----------------|----------------|-------------|
| Handler Tests | 1-3s | 50-100ms | 10-30x faster |
| Page Tests | 2-5s | 200-500ms | 10x faster |
| Integration Tests | 5-10s | 2-5s | 2x faster |
| **Total Suite** | **30-60s** | **5-10s** | **5-6x faster** |

## Benefits

1. **Faster Development**: Rapid test feedback
2. **Better Isolation**: Tests don't interfere with each other
3. **Clearer Intent**: Test level matches functionality level
4. **Easier Debugging**: Failures are isolated to specific components
5. **Resource Efficiency**: No resource leaks or cleanup issues
6. **Fresh Idiomatic**: Follows Fresh framework best practices

## Migration Strategy

### Backwards Compatibility
- Keep existing test utilities during migration
- Migrate tests incrementally by category
- Maintain all existing test coverage during transition

### Risk Mitigation
- Run both old and new test patterns in parallel during migration
- Ensure new patterns provide equivalent coverage
- Add integration tests to catch any regressions from lighter mocking

### Success Metrics
- [ ] Test suite runtime reduced by >80%
- [ ] All tests pass without `sanitizeResources: false`
- [ ] Test coverage maintained or improved
- [ ] New test patterns documented with examples
