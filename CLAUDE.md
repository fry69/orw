# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenRouter API Watcher (orw) monitors changes in OpenRouter models and stores those changes in a SQLite database. It consists of:

- **Backend watcher**: Queries OpenRouter API every hour, detects model changes using deep-diff, stores in SQLite
- **Web interface**: Fresh framework app for viewing models and change history
- **RSS feed**: Available at `/rss` endpoint for change notifications

## Development Commands

All development happens in the `orw-deno/` directory:

```bash
# Development server with hot reload
cd orw-deno && deno task dev

# Production build and serve
cd orw-deno && deno task build && deno task serve

# Linting and formatting
cd orw-deno && deno task lint
cd orw-deno && deno task fmt
cd orw-deno && deno task check

# Run tests
cd orw-deno && deno task test

# Pre-commit checks (format, lint, check, test)
cd orw-deno && deno task pre-commit
```

Alternative using Makefile from root:
```bash
make dev        # Start development server
make pre        # Run pre-commit checks
```

## Container Operations

Using Makefile from root directory:

```bash
make build      # Build container images
make smart-up   # Start services (seeds database if needed)
make down       # Stop services
make status     # Show service status and logs
make logs       # Follow service logs
make clean      # Remove containers and prune images
```

## Architecture

### Core Components

- **OpenRouterAPIWatcher** (`server/watcher.ts`): Main class that fetches API data, compares models, detects changes
- **Database** (`server/database/`): SQLite with migrations for models, changes, removed models, API checks
- **Fresh App** (`main.ts`, routes/, islands/): Web interface using Fresh 2.0 framework
- **State Management**: Preact signals for reactive UI updates

### Key Patterns

- **Singleton Watcher**: Single `OpenRouterAPIWatcher` instance shared across app via `getWatcher()`
- **Islands Architecture**: Interactive UI components in `islands/` (ModelList, ChangeList, NavBar, etc.)
- **Type Safety**: Comprehensive TypeScript interfaces in `lib/types.ts`

### Data Flow

1. Watcher fetches OpenRouter API every hour
2. Compares with previous data using deep-diff
3. Stores changes/additions/removals in SQLite
4. Web interface displays real-time data via islands
5. RSS feed generates from recent changes

## Technology Stack

- **Runtime**: Deno 2.x
- **Framework**: Fresh 2.0 (canary)
- **Database**: SQLite with node:sqlite (Deno built-in)
- **UI**: Preact + Preact Signals
- **Styling**: TailwindCSS 4.x + DaisyUI 5.x
- **Utilities**: luxon (dates), deep-diff (comparisons), rss (feed generation)

## File Structure

```
orw-deno/
├── components/     # Shared UI components
├── islands/        # Interactive client-side components
├── lib/           # Shared utilities, types, constants
├── routes/        # Fresh file-based routing
├── server/        # Backend watcher and database logic
├── static/        # Static CSS and assets
├── main.ts        # Production app entry point
└── dev.ts         # Development entry point
```

## Environment Configuration

Key environment variables (see `.env.example`):
- `ORW_DATA_PATH`: Data directory path (default: `./data`)
- `ORW_DISABLE_WATCHER`: Set to "true" to disable background API polling
- `ORW_PUBLIC_URL`: Public URL for RSS feed links
- `NODE_ENV`: Environment (development/production)

## Important Implementation Notes

- Database uses auto-migrations on startup
- Watcher runs as singleton background process
- Fresh uses file-system based routing
- Islands provide client-side interactivity
- All dates use luxon for timezone handling
- Deep-diff library detects model field changes
- RSS feed uses intelligent caching tied to API check intervals