v0.4.0-dev:

- port from Bun to native NodeJS
- restructure file layout

v0.3.0-dev:

New API Version 3:

- /api/data -> /api/lists

Watcher:

- refactor separate in-memory lists into one object

Web client:

- refactor main API/update logic from NavBar into Brain
- consolidate client/server types
- improved fetch error handling
- minor other refactor
- implemented soft fetch error backoff
  - every error doubles interval time
  - hard refresh browser window after doubling 5 times
- show percentages for price changes

Server:

- RSS feed now uses the same code to generate changes as the web client

Miscellaneous:

- added eslint

Documentation:

- added installation instructions (INSTALL.md)
- added rough internal design document (DESIGN.md)

v0.2.1:

Server/watcher improvements:

- revamped memory caching
- fixed dbLastChange bug

v0.2.0:

Web client improvments:

- code cleanup/simplification
- much improved error handling
- no more hard refresh
- API version check to prevent future incompatibility problems
- much improved update loop
- improved API handling
- show version

v0.1.0:

- massive internal simplification
- internal API always transmists full data if database changed
- may need limiting if change list gets huge (last 500 changes?)
- API status endpoint to check if new data is available
- client renders everything from memory until new data is available
- RSS endpoint is still limited to last 50 changes (seems reasonable)

v0.0.1:

- first working implementation
