# orw: OpenRouter API Watcher

The OpenRouter API Watcher is a tool that monitors changes in OpenRouter models and stores those changes in a SQLite database. It queries the model list via the API every hour and includes a modern web interface for viewing the changes.

## Installation

To run the OpenRouter API Watcher, you'll need [Deno](https://deno.land) runtime (version 1.40+).

No package installation is required - Deno will automatically download dependencies on first run.

## Usage

### Recommended: Start Both Server and Watcher

Start both the HTTP server and background watcher (recommended for most users):

```bash
# Using the CLI
deno run --allow-all cli.ts --serve

# Or using the convenience script
deno run --allow-all start.ts

# Or directly via main.ts
deno run --allow-all main.ts
```

This will start:

- HTTP server on http://localhost:3100 (configurable)
- Background watcher that checks for API changes every hour

### Advanced Usage

The tool supports several modes via the CLI:

#### 1. Background Mode Only (no HTTP server)

```bash
deno run --allow-all cli.ts --background
```

#### 2. HTTP Server Only (no background watcher)

```bash
deno run --allow-all cli.ts --serve --no-watcher
```

#### 3. Query Mode (view recent changes)

```bash
deno run --allow-all cli.ts --query 20
```

#### 4. One-Time Check

```bash
deno run --allow-all cli.ts --run-once
```

### Configuration Options

```bash
# Custom port and hostname
deno run --allow-all cli.ts --serve --port 8080 --hostname 0.0.0.0

# Custom data directory
deno run --allow-all cli.ts --serve --data-dir /path/to/data

# Environment variables
ORW_PORT=8080 ORW_HOSTNAME=0.0.0.0 ORW_DATA_PATH=/data deno run --allow-all cli.ts --serve
```

### Development

For development with hot-reloading:

```bash
deno run -A --watch=components/,islands/,lib,/routes/,server/,shared/,static/ dev.ts
```

## Web Interface

The OpenRouter API Watcher includes a modern web interface built with Fresh framework that allows you to:

- View the complete list of OpenRouter models
- Browse change history and see what models were added/removed/modified
- Real-time updates when changes are detected

By default, the web interface is available at http://localhost:3100.

## RSS feed

The OpenRouter API Watcher also includes a RSS feed generator, available at the `/rss` endpoint. It will serve the last 50 recorded changes as formatted JSON encapsulated in a `<code>` tag, so it does not look like a garbled mess in RSS readers.

## Testing

You can run a set of simple test cases with the following command:

```bash
bun test
```

## License

This project is licensed under the [MIT License](LICENSE).
