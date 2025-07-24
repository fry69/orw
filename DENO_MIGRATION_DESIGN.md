# Deno 2 Migration Design Document

## Executive Summary

This document outlines the migration plan from Node.js to Deno 2 for the OpenRouter Watcher (ORW) project. The migration aims to drastically simplify the codebase, reduce dependencies, eliminate caching complexity, and leverage Deno 2's built-in features.

## Current Architecture Analysis

### Technology Stack (Current)
- **Runtime**: Node.js with pnpm package manager
- **Backend**: TypeScript HTTP server using native Node.js `http` module
- **Database**: Node.js built-in SQLite (`node:sqlite`)
- **Frontend**: React 19 with Vite build system
- **Dependencies**: 25+ npm packages with complex build pipeline

### Core Components
1. **Watcher** (`server/watcher.ts`) - OpenRouter API monitoring and change detection
2. **HTTP Server** (`server/httpServer.ts`) - Web server with caching, compression, RSS feeds
3. **React Frontend** (`src/`) - Model browser and change viewer
4. **Database Layer** (`server/migrations/`) - SQLite with custom migration system

### Problematic Areas Identified

#### 1. Complex Build Pipeline
- Separate TypeScript compilation for server and client
- Vite bundling with multiple plugins
- Complex package.json scripts (15+ scripts)
- Dual tsconfig.json files

#### 2. Dependency Management
- 25+ production/dev dependencies
- Complex peer dependency chains (React ecosystem)
- Custom compression and caching logic
- External packages for basic functionality

#### 3. Caching Complexity
- File-based caching system with ETag generation
- Gzip compression handling
- Complex cache invalidation logic
- Background compression pipeline

#### 4. Import/Module Issues
- Mixed ESM/CommonJS workarounds (`diffpkg` workaround)
- Complex module resolution
- `.js` extensions required for TypeScript imports

## Deno 2 Migration Plan

### Phase 1: Core Infrastructure Migration

#### 1.1 Replace Package Manager and Dependencies
**Current**: pnpm with package.json
**Target**: deno.json with import map

```json
{
  "name": "orw-deno",
  "version": "0.5.0",
  "tasks": {
    "dev": "deno run --allow-net --allow-read --allow-write --allow-env --watch server/main.ts",
    "start": "deno run --allow-net --allow-read --allow-write --allow-env server/main.ts",
    "test": "deno test --allow-all",
    "build": "deno run --allow-all scripts/build.ts"
  },
  "imports": {
    "@std/assert": "jsr:@std/assert@1",
    "@std/path": "jsr:@std/path@1", 
    "@std/fs": "jsr:@std/fs@1",
    "@std/crypto": "jsr:@std/crypto@1",
    "@std/http": "jsr:@std/http@1",
    "@std/encoding": "jsr:@std/encoding@1",
    "react": "npm:react@19.1.0",
    "react-dom": "npm:react-dom@19.1.0",
    "react-router-dom": "npm:react-router-dom@7.7.0",
    "styled-components": "npm:styled-components@6.1.19",
    "react-data-table-component": "npm:react-data-table-component@7.7.0",
    "deep-diff": "npm:deep-diff@1.0.2"
  },
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```

#### 1.2 Database Migration
**Current**: `node:sqlite` with DatabaseSync
**Target**: Deno's built-in SQLite

```typescript
// Replace node:sqlite with Deno's built-in
import { Database } from "https://deno.land/x/sqlite@v3.8.0/mod.ts";
// OR use the new Deno.sqlite when available
```

#### 1.3 HTTP Server Simplification
**Current**: Complex caching, compression, ETag generation
**Target**: Deno's built-in HTTP with simplified serving

```typescript
import { serveDir, serveFile } from "@std/http/file-server";
import { Server } from "@std/http/server";

// Eliminate complex caching - use Deno's built-in performance
// Remove ETag generation - rely on standard HTTP caching
// Remove gzip compression - use built-in compression
```

### Phase 2: Eliminate Caching Complexity

#### 2.1 Remove File Caching System
- **Delete**: `cacheAndCompressFile()`, `cacheAndServeContent()`
- **Replace**: Direct serving with Deno's optimized file serving
- **Benefit**: 200+ lines of complex caching code eliminated

#### 2.2 Simplify Static File Serving
**Current**: Complex file discovery, compression, ETag handling
**Target**: Use `@std/http/file-server`

```typescript
// Replace complex static file serving with:
import { serveDir } from "@std/http/file-server";

const handler = (req: Request): Response => {
  const url = new URL(req.url);
  
  // API routes
  if (url.pathname.startsWith('/api/')) {
    return handleAPI(req);
  }
  
  // Static files - let Deno handle optimization
  return serveDir(req, {
    fsRoot: "./dist",
    showDirListing: false,
  });
};
```

### Phase 3: Frontend Build Simplification

#### 3.1 Replace Vite with Deno Bundle
**Current**: Vite + plugins + complex configuration
**Target**: Native Deno bundling or simplified esbuild

```typescript
// build.ts - Simple build script
import { bundle } from "https://deno.land/x/emit@0.31.0/mod.ts";

const result = await bundle("./src/main.tsx", {
  compilerOptions: {
    jsx: "react-jsx",
  },
});

await Deno.writeTextFile("./dist/bundle.js", result.code);
```

#### 3.2 Eliminate Build Tools
- **Remove**: Vite, TypeScript compiler, ESLint complex config
- **Replace**: Deno's built-in linting, formatting, and bundling
- **Benefits**: No node_modules, no complex build pipeline

### Phase 4: Modern Import Syntax

#### 4.1 Update Import Statements
**Current**: Relative paths with `.js` extensions
**Target**: Clean import map references

```typescript
// Current
import { OpenRouterAPIWatcher } from "./watcher.js";
import { pipeline } from "node:stream/promises";

// Target  
import { OpenRouterAPIWatcher } from "./watcher.ts";
import { readableStreamFromReader } from "@std/streams";
```

#### 4.2 Remove Node.js Specific Imports
```typescript
// Replace Node.js APIs with Deno equivalents
import process from "node:process"; // → Deno.env, Deno.exit
import fs from "node:fs"; // → @std/fs
import path from "node:path"; // → @std/path
import crypto from "node:crypto"; // → @std/crypto
```

### Phase 5: Database Layer Modernization

#### 5.1 Simplify Migration System
**Current**: Complex file-based migrations with manual versioning
**Target**: Simplified Deno-native approach

```typescript
import { Database } from "@std/sqlite";

class SimpleMigrations {
  private db: Database;
  
  constructor(dbPath: string) {
    this.db = new Database(dbPath);
  }
  
  async migrate() {
    // Use Deno's built-in SQL execution
    // Simpler migration tracking
  }
}
```

## Removed Dependencies Analysis

### NPM Dependencies to Eliminate (25 packages)
1. **Build Tools**: `vite`, `@vitejs/plugin-react`, `typescript`, `eslint` complex config
2. **Node.js Utilities**: `mime-types` (use Web APIs), `@types/node`
3. **Complex Tooling**: `typedoc`, `prettier`, `vitest` (use Deno test)
4. **Compression**: `vite-plugin-compression2` (use built-in)

### Dependencies to Keep (React Ecosystem via npm:)
- `react@19.1.0` 
- `react-dom@19.1.0`
- `react-router-dom@7.7.0`
- `styled-components@6.1.19`
- `react-data-table-component@7.7.0`
- `deep-diff@1.0.2`

## File Structure Changes

### New Structure
```
orw/
├── deno.json                     # Replaces package.json + tsconfig
├── server/
│   ├── main.ts                   # Entry point (replaces watcher.ts)
│   ├── watcher.ts                # Simplified watcher
│   ├── http-server.ts            # Simplified HTTP server
│   ├── database.ts               # Simplified DB layer
│   └── migrations.ts             # Simplified migrations
├── src/                          # React frontend (minimal changes)
├── static/                       # Static files
└── scripts/
    └── build.ts                  # Simple build script
```

### Removed Files/Directories
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- `tsconfig.json`, `tsconfig.node.json`
- `vite.config.ts`
- `eslint.config.js`
- `server/tsconfig.json`
- `tools/` directory
- `node_modules/`

## Implementation Roadmap

### Week 1: Infrastructure Setup
1. Create `deno.json` with import map
2. Update all imports to use Deno standard library
3. Replace Node.js APIs with Deno equivalents
4. Create simplified HTTP server

### Week 2: Remove Caching Complexity
1. Eliminate file caching system
2. Simplify static file serving using `@std/http`
3. Remove compression pipeline
4. Test performance without caching

### Week 3: Frontend Build Migration
1. Create simple Deno-based build script
2. Remove Vite and related dependencies
3. Update React component imports
4. Test frontend functionality

### Week 4: Database and Testing
1. Migrate SQLite to Deno's built-in database
2. Simplify migration system
3. Convert tests to Deno test framework
4. Performance testing and optimization

## Benefits Summary

### Complexity Reduction
- **Lines of Code**: ~30% reduction (eliminate caching, build tools)
- **Dependencies**: 25+ npm packages → 6 npm packages via import map
- **Build Scripts**: 15 scripts → 4 tasks
- **Config Files**: 6 config files → 1 deno.json

### Performance Improvements
- **Startup Time**: Faster due to no node_modules resolution
- **Memory Usage**: Lower overhead without Node.js ecosystem
- **Bundle Size**: Smaller due to tree-shaking and Deno optimizations

### Developer Experience
- **No npm install**: Dependencies resolved at runtime
- **Built-in Tools**: Formatting, linting, testing included
- **Type Safety**: Better TypeScript integration
- **Security**: Explicit permissions model

## Risk Assessment

### Low Risk
- Core business logic (watcher, database) remains unchanged
- React frontend requires minimal changes
- Database migration is straightforward

### Medium Risk  
- HTTP caching performance without complex system
- Learning curve for team on Deno-specific patterns
- Potential React ecosystem compatibility issues

### Mitigation Strategies
1. **Performance Testing**: Benchmark before/after migration
2. **Gradual Migration**: Migrate components incrementally
3. **Fallback Plan**: Keep Node.js version until Deno version is stable

## Success Metrics

### Quantitative
- Build time reduction: >50%
- Dependencies reduction: >80%
- Lines of configuration: >70% reduction
- Memory usage: >20% reduction

### Qualitative
- Simplified deployment
- Easier onboarding for new developers
- Reduced maintenance overhead
- Better development experience

## Conclusion

The migration to Deno 2 represents a significant simplification opportunity. By eliminating complex caching, reducing dependencies, and leveraging Deno's built-in capabilities, the project will become more maintainable, performant, and developer-friendly while preserving all core functionality.

The React frontend will continue to work with minimal changes, and the core watcher/database logic remains intact, making this migration both safe and beneficial.
