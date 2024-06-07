# orw: OpenRouter API Watcher

The OpenRouter API Watcher is a tool that monitors changes in OpenRouter models and stores those changes in a SQLite database. It queries the model list via the API every hour and includes a simple web interface for viewing the changes.

## Installation

For details how to run the OpenRouter API Watcher as user systemd service, see the [INSTALL](INSTALL.md).

Quick overview: To run the OpenRouter API Watcher, you'll need a recent Node.js (v22). The `tools/start.sh` script includes the necessary installtion steps (assuming you are running on Mac or Linux):

- install a recent Node.js version via [fnm](https://github.com/Schniz/fnm)
- install the necessary dependencies via npm
- generate the webclient and server code via tsc
- start the watcher

Note that `tools/start.sh` will not work if you have not setup a local production environment (see [INSTALL](INSTALL.md)).

## Web Interface

The OpenRouter API Watcher includes a simple web interface that allows you to view the list of models and the changes that have been detected. By default, the web interface starts on a random, available port. Check the console output for the URL.

## RSS feed

The OpenRouter API Watcher also includes a RSS feed generator, available at the `/rss` endpoint. It will serve the last 50 recorded changes as formatted JSON encapsulated in a `<code>` tag, so it does not look like a garbled mess in RSS readers.

## Testing

You can run a set of simple test cases with the following command:

```bash
npm run test
```

## License

This project is licensed under the [MIT License](LICENSE).
