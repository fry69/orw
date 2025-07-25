# ORW Startup Options

This document explains the different ways to start the OpenRouter Watcher application.

## Quick Start (Recommended)

For most users, the easiest way is:

```bash
deno run --allow-all cli.ts --serve
```

This starts both the HTTP server and the background watcher.

## All Available Methods

### 1. CLI with Full Control (Recommended)

```bash
# Start both server and watcher (most common)
deno run --allow-all cli.ts --serve

# Start server only (no background monitoring)
deno run --allow-all cli.ts --serve --no-watcher

# Start watcher only (no web interface)
deno run --allow-all cli.ts --background

# Query recent changes
deno run --allow-all cli.ts --query 20

# Run once and exit
deno run --allow-all cli.ts --run-once
```

### 2. Convenience Script

```bash
# Simple startup with defaults
deno run --allow-all start.ts
```

### 3. Direct Main Entry

```bash
# Backwards compatibility - starts server with watcher
deno run --allow-all main.ts
```

### 4. Development Mode

```bash
# Development with hot-reloading (watcher disabled by default)
deno run -A --watch=components/,islands/,lib,/routes/,server/,shared/,static/ dev.ts

# Development with watcher enabled
deno run --allow-all cli.ts --serve --port 8000
```

## Configuration

### Environment Variables

```bash
export ORW_PORT=3100
export ORW_HOSTNAME=localhost
export ORW_DATA_PATH=./data
```

### Command Line Options

```bash
deno run --allow-all cli.ts --serve --port 8080 --hostname 0.0.0.0 --data-dir /custom/path
```

## Use Cases

- **Production deployment**: Use `cli.ts --serve`
- **Development**: Use `dev.ts` for frontend work, `cli.ts --serve` for full-stack testing
- **Monitoring only**: Use `cli.ts --background`
- **Data analysis**: Use `cli.ts --query N` to see recent changes
- **Manual updates**: Use `cli.ts --run-once`

## Architecture

The application consists of two main components:

1. **HTTP Server**: Fresh-based web interface for viewing models and changes
2. **Background Watcher**: Monitors OpenRouter API every hour for changes

Both can run independently or together, depending on your needs.
