v0.1.0:

- massive internal simplification
- internal API always transmists full data if database changed
- may need limiting if change list gets huge (last 500 changes?)
- API status endpoint to check if new data is available
- client renders everything from memory until new data is available
- RSS endpoint is still limited to last 50 changes (seems reasonable)

v0.0.1:

- first working implementation
