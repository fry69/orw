# orw: OpenRouter API Watcher

The OpenRouter API Watcher is a tool that monitors changes in OpenRouter models and stores those changes in a SQLite database. It queries the model list via the API every hour and includes a modern web interface for viewing the changes.

**Important Note:** The main application has been rewritten in [Fresh](https://fresh.deno.dev/) / [Deno](https://deno.land/) and is now located in the `orw-deno/` directory. All commands should be run from within that directory.

## Installation

To run the OpenRouter API Watcher, you'll need [Deno](https://deno.land) runtime (version 1.40+).

No package installation is required - Deno will automatically download dependencies on first run. For detailed installation instructions, please see [INSTALL.md](INSTALL.md).

## Usage

All commands should be executed from within the `orw-deno` directory.

### Recommended: Start Both Server and Watcher

To start the HTTP server and the background watcher, run:

```bash
cd orw-deno
deno task serve
```

This will start:
- HTTP server on http://localhost:8000 (configurable via `.env` file)
- Background watcher that checks for API changes every hour

### Development

For development with hot-reloading:

```bash
cd orw-deno
deno task dev
```

## Web Interface

The OpenRouter API Watcher includes a modern web interface built with the Fresh framework that allows you to:

- View the complete list of OpenRouter models
- Browse change history and see what models were added/removed/modified
- Real-time updates when changes are detected

By default, the web interface is available at http://localhost:8000.

## RSS feed

The OpenRouter API Watcher includes an RSS feed generator, available at the `/rss` endpoint. It serves the last 50 recorded changes with proper HTML formatting:

- **Added models**: Shows full model details in JSON format
- **Removed models**: Shows full model details of the removed model
- **Updated models**: Shows specific field changes with old/new values highlighted

The RSS feed uses **intelligent caching** - instead of a fixed cache time, it dynamically calculates when the next API check will happen (when new changes could appear) and sets the cache expiration accordingly. This means RSS clients will fetch fresh content exactly when needed, optimizing both performance and freshness.

## Testing

The project includes a dummy test to ensure the test runner is configured correctly. You can run it with:

```bash
cd orw-deno
deno task test
```

## Database

- **Seeding:** The public seed database is currently unavailable. You will need to start with a fresh database or provide your own.
- **Backup:** The automated database backup mechanism is not functional at the moment.

## License

This project is licensed under the [MIT License](LICENSE).
