This project uses latest Deno 2 and Fresh 2 versions, please consult the online documentation for updated information:

- https://fresh.deno.dev/docs/canary/introduction
- https://fresh.deno.dev/docs/canary/examples/migration-guide

Use tasks defined in `deno.json` in the repository root instead of invoking deno manually without those tasks.

If an import in a source code file looks funky, first check if it is due to being an alias defined in `deno.json` or, if present, `import_map.json`, both in the repository root.

All imports must be pinned to specific versions via alias in `deno.json` or `import_map.json`, never in any source code file!
