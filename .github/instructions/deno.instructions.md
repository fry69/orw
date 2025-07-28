# Deno 2

Use tasks defined in `deno.json` in the repository root instead of invoking Deno manually without those tasks.

If an import in a source code file looks funky, first check if it is due to being an alias defined in `deno.json` or, if present, `import_map.json`. Both are located in the repository root.

NOTE: All imports must be pinned to specific versions via alias in `deno.json` or `import_map.json`, never in any source code file!
