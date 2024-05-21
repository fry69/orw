v0.2.2-dev:

- refactor main API/update logic from NavBar into Brain
- consolidate client/server types

v0.2.1:

Server/watcher improvements:

- revamped memory caching
- fixed dbLastChange bug

v0.2.0:

Web client improvments:

- code cleanup/simplification
- much improved error handling
- no more hard refresh
- API version check to prevent future incompatiblity problems
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
