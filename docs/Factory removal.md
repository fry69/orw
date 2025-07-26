I'll analyze the current code structure and create a roadmap for removing the factory logic and restructuring the server components. Let me first examine the current state of the codebase. Now let me look at the routes to understand how the watcher is currently used: Now let me look at the project layout analysis document: Let me continue reading the analysis to understand the recommendations better: Now let me check if there are any remaining factory-related imports or files: Based on my analysis, here's my comprehensive **roadmap and design document** for removing the factory pattern and restructuring the server components:

# ORW Server Refactoring Roadmap & Design Document

## Current State Analysis

### Factory Pattern Issues
The current watcher-factory.ts adds unnecessary complexity:
1. **Single responsibility violation**: Mixes production and test concerns
2. **Circular complexity**: The factory just wraps constructor calls with basic config merging
3. **Import pollution**: CLI, main.ts backup, and tests all depend on factory
4. **Non-idiomatic**: Factory pattern not really needed for simple configuration object

### Current Dependencies
```
cli.ts → watcher-factory.ts → watcher.ts
main.ts.backup → watcher-factory.ts → watcher.ts
test/helpers/test-setup.ts → [direct watcher instantiation - GOOD]
```

### Current Watcher Constructor
The `OpenRouterAPIWatcher` already accepts configuration via constructor, making factory redundant:
```typescript
constructor(config: Partial<typeof defaultConfig>) {
  this.config = { ...defaultConfig, ...config };
  // ... rest of setup
}
```

## Design Philosophy

### Core Principles
1. **Keep main.ts minimal**: As you specified, main.ts should be just Fresh app boilerplate
2. **Direct instantiation over factories**: Simpler, more explicit, easier to debug
3. **Modular server structure**: Split concerns into logical, focused modules
4. **Single source of truth**: One place for global watcher initialization
5. **Clear separation**: Database, watcher, and API handlers as distinct concerns

### Proposed Architecture

```
server/
├── database/
│   ├── index.ts         # Database module exports (connection, migrations)
│   ├── database.ts      # Core database logic (renamed from current)
│   └── migrations/      # Migration files (existing)
├── watcher/
│   ├── index.ts         # Watcher module exports
│   ├── watcher.ts       # Core watcher logic (current file)
│   └── config.ts        # Configuration utilities and defaults
├── api/
│   └── handlers.ts      # Shared API utilities and helpers
└── app.ts               # Application service layer (NEW - global watcher)
```

## Implementation Roadmap

### Phase 1: Remove Factory Pattern ✅ PRIORITY
**Goal**: Eliminate watcher-factory.ts completely

**Steps**:
1. **Update CLI**: Replace factory calls with direct watcher instantiation
2. **Update tests**: Already using direct instantiation - verify no factory imports
3. **Delete factory file**: Remove watcher-factory.ts
4. **Clean up imports**: Remove any remaining factory imports

**Benefits**:
- Reduces complexity by ~50 lines of unnecessary abstraction
- Makes watcher instantiation explicit and debuggable
- Eliminates circular dependency patterns

### Phase 2: Create Application Service Layer
**Goal**: Move global watcher logic out of main.ts

**New file**: app.ts
```typescript
// server/app.ts - Application service layer
import { OpenRouterAPIWatcher } from "./watcher/index.ts";
import { createDatabase } from "./database/index.ts";
import { getWatcherConfig } from "./watcher/config.ts";

let globalWatcher: OpenRouterAPIWatcher | null = null;

export async function getGlobalWatcher(): Promise<OpenRouterAPIWatcher> {
  if (!globalWatcher) {
    const config = getWatcherConfig();
    const db = await createDatabase(config.dbFilePath);

    globalWatcher = new OpenRouterAPIWatcher({ ...config, db });
    await globalWatcher.initialize({ seed: true });
  }
  return globalWatcher;
}

export function resetGlobalWatcher() {
  globalWatcher = null; // For testing
}
```

**Benefits**:
- Keeps main.ts clean (just Fresh boilerplate)
- Centralizes watcher lifecycle management
- Provides clean testing interface
- Makes watcher initialization explicit

### Phase 3: Restructure Server Directory
**Goal**: Organize server code into logical modules

#### 3A: Database Module
```
server/database/
├── index.ts       # Exports: createDatabase, runMigrations
├── database.ts    # Current database.ts (renamed)
└── migrations/    # Existing migration files
```

#### 3B: Watcher Module
```
server/watcher/
├── index.ts       # Exports: OpenRouterAPIWatcher, getWatcherConfig
├── watcher.ts     # Current watcher.ts (moved)
└── config.ts      # Configuration logic (NEW)
```

**New file**: `server/watcher/config.ts`
```typescript
// server/watcher/config.ts - Watcher configuration utilities
import { join } from "@std/path";

export interface WatcherConfig {
  dataDir: string;
  dbFilePath: string;
  logFilePath: string;
  backupDir: string;
  fixedModelList?: Model[];
}

export function getWatcherConfig(): WatcherConfig {
  const dataDir = Deno.env.get("ORW_DATA_PATH") || "./data";

  return {
    dataDir,
    dbFilePath: Deno.env.get("ORW_DB_PATH") ?? join(dataDir, "orw.db"),
    logFilePath: Deno.env.get("ORW_LOG_PATH") ?? join(dataDir, "orw.log"),
    backupDir: Deno.env.get("ORW_BACKUP_PATH") || join(dataDir, "backup"),
  };
}
```

#### 3C: API Module
```
server/api/
└── handlers.ts    # Shared API utilities (if needed)
```

### Phase 4: Update Import Paths
**Goal**: Update all imports to use new module structure

**Files to update**:
- lists.ts → Import from app.ts
- status.ts → Import from app.ts
- cli.ts → Direct watcher instantiation
- All test files → Update paths as needed

## Technical Considerations

### Configuration Strategy
- **Environment-based**: Use environment variables with sensible defaults
- **No factory needed**: Direct constructor calls with config objects
- **Testable**: Easy to override config for testing

### Error Handling
- **Graceful degradation**: Handle missing database/config gracefully
- **Clear error messages**: Explicit error reporting for config issues
- **Fail fast**: Catch configuration errors at startup

### Testing Strategy
- **Isolated testing**: Each module testable in isolation
- **Mock-friendly**: Easy to mock database/watcher for tests
- **Integration tests**: Full app testing via test helpers

### Migration Strategy
- **Backwards compatible**: Existing database migrations unaffected
- **Gradual rollout**: Can implement in phases without breaking changes
- **Easy rollback**: Changes are additive, easy to revert

## File Change Summary

### Files to DELETE:
- watcher-factory.ts ❌
- main.ts.backup ❌ (mentioned you want this gone)

### Files to CREATE:
- app.ts ✨ (global watcher management)
- `server/watcher/config.ts` ✨ (configuration utilities)
- `server/database/index.ts` ✨ (database module exports)
- `server/watcher/index.ts` ✨ (watcher module exports)

### Files to MOVE:
- database.ts → database.ts
- watcher.ts → `server/watcher/watcher.ts`

### Files to MODIFY:
- cli.ts (remove factory, use direct instantiation)
- lists.ts (import from server/app.ts)
- status.ts (import from server/app.ts)
- main.ts (keep minimal, just Fresh boilerplate)

## Benefits Summary

1. **Simplified Architecture**: No unnecessary factory abstraction
2. **Clear Separation**: Database, watcher, and app logic properly separated
3. **Maintainable**: Each module has single responsibility
4. **Testable**: Easy to test individual components
5. **Clean main.ts**: Keeps startup file minimal as requested
6. **Scalable**: Easy to add new server modules in the future

## Risk Assessment

**Low Risk Changes**:
- Removing factory (just eliminates abstraction)
- Moving files (simple path updates)
- Creating config utilities (additive)

**Medium Risk Changes**:
- Restructuring imports (need to update multiple files)
- Moving global watcher logic (affects API routes)

**Mitigation**:
- Make changes incrementally
- Run tests after each phase
- Keep backup of working state

---

**Recommendation**: This restructuring aligns perfectly with your goals of removing factory complexity while creating a more maintainable, modular server architecture. The proposed structure follows common Node.js/Deno patterns and makes the codebase more approachable for new contributors.

**Next Step**: Should I proceed with Phase 1 (removing the factory pattern) first?