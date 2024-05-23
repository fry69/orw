## Internal design

The OpenRouter API Watcher broadly consists of three parts:

### `orw.ts`

- It contains the core watcher logic, it polls the OpenRouter API for the current model list, compares it to the stored version, calculates the differences and stores all data into a SQLite database (`orw.db` by default).
- It holds in-memory copies of all data, but stores everything immediately, so it can be restarted at any time.
- It stores the time of the last OpenRouter API check inside the database and upon restart will only make a new request to the OpenRouter API when the last one is more than an hour ago.
- It re-tries one time after one minute after a request to the OpenRouter API failed, then it waits another hour for the next try.
- Upon detecting changes, it creates a fresh database backup in the `backup` directory after storing all data.

### `server.ts`

- It serves the API, the web client and the RSS feed.
- It relies on `vite` copying and creating gzipped files for everything that is in the `static` directory.
- It is designed to minimize traffic and overhead.
- It creates gzipped cache and Etag files of every relevant request in the `cache` directory.
- The web server will send out `Cache-Control`, `Etag` and `Last-Modified` headers and honor respective fields in requests to keep communication with the browser and RSS feed readers at a minimum, if they support these features.

### Web client

- It is a simple React web app, it can be found in the `client` directory.
- It shows
  - `/list` the current model list as a sortable table
  - `/removed` the removed model list as a sortable table
  - `/changes` the list of recorded changes
  - `/model?id=<model-id>` details about the individual model `<model-id>`
- It reads all data from the API server upon first load.
- After the time for the next OpenRouter API check has elapsed (plus one minute), it queries a status endpoint on the API to learn if new data is available and only then re-load the data again.
- It contains various checks for error conditions and will backoff doubling the wait time with every error it receives, if the API cannot be reached.
- It will hard reload the web browser window after more than five failed attempts (~15h) to reach the API (showing a clear error message is IMHO better than a stale client).
