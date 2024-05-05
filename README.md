# watch-or

This tool watches for changes in OpenRouter models and stores the changes in a SQLite database. It queries the model list via API every hour.

## Installation

To install dependencies (currently only [deep-diff](https://github.com/flitbit/diff)):

```bash
bun install
```
## Usage

To run in background mode:

```bash
bun run watch-or.ts
```

List recent changes, defaults to 10:

```bash
bun run watch-or.ts --query [number]
```

## Testing

A test script with a few simple test cases can be run with:

```bash
bun test
```

## License

This project is licensed under the [MIT License](LICENSE).
