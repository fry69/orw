# orw: OpenRouter API Watcher

The OpenRouter API Watcher is a tool that monitors changes in OpenRouter models and stores those changes in a SQLite database. It queries the model list via the API every hour and includes a simple web interface for viewing the changes.

## Installation

To run the OpenRouter API Watcher, you'll need the [Bun](https://bun.sh) runtime. Install the dependencies with the following command:

```bash
bun install
```

Build the web client with the following command:

```bash
bun run build
```

## Usage

The tool can be run in three different modes:

1. **Background Mode**: To run the watcher in the background, use the following command:

   ```bash
   bun run orw.ts
   ```

   The watcher will continuously monitor the OpenRouter API and store any changes in the database.

2. **Query Mode**: To view the most recent changes, use the following command:

   ```bash
   bun run orw.ts --query [number]
   ```

   Replace `[number]` with the maximum number of changes you want to display (default is 10).

3. **One-Time Mode**: To run the watcher just once, use the following command:

   ```bash
   bun run orw.ts --once
   ```

   This will perform a single check and update the database if any changes are detected.

## Web Interface

The OpenRouter API Watcher includes a simple web interface that allows you to view the list of models and the changes that have been detected. By default, the web interface starts on a random, available port. Check the console output for the URL.

## RSS feed

The OpenRouter API Watcher also includes a RSS feed generator, available at the `/rss` endpoint. It will serve the last 50 recorded changes as formatted JSON encapsulated in a `<code>` tag, so it does not look like a garbled mess in RSS readers.

## Screenshots (slightly outdated)

Model List:

![Model List](screenshots/ModelList.png)

Model List with Search:

![Model List with search](screenshots/ModelList-search.png)

Model Details:

![Model Details](screenshots/ModelDetail.png)

Change List:

![Change List](screenshots/ChangeList.png)

## Testing

You can run a set of simple test cases with the following command:

```bash
bun test
```

## License

This project is licensed under the [MIT License](LICENSE).