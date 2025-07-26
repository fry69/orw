I want to create a command line interface to start up a Fresh 2 server with Deno 2 , but I have trouble getting it to work. It seems `deno serve` is mandatory to start the server in production mode, pointing at the compiled assets in the `_fresh` folder.

How can I do this programmatically, as the CLI should also support a mode without starting this server? The `cli.ts` should get invoked with `deno run` instead of `deno serve`.

It seems this is impossible with current Fresh 2 alpha releases

---

Currently, with Fresh 2 (still in alpha), **starting the server in production mode requires using `deno serve` pointing at the compiled assets in the `_fresh` folder**, and it is not designed to be started programmatically from a custom CLI invoked via `deno run` directly on the compiled output. The typical way to start the production Fresh server is indeed:

```bash
deno serve _fresh/main.js
```

or pointing to the built entry point.

Trying to run the compiled assets (`_fresh/main.js`) directly with `deno run` results in errors like `ReferenceError: history is not defined` because the compiled `_fresh` folder assets are optimized for the `deno serve` runtime rather than a simple `deno run` environment[2].

Regarding your need to create a CLI that:

- Supports starting the Fresh server programmatically (i.e., start the server process from within the CLI)
- Supports a mode that does not start the server (for example, just CLI tooling or other commands)
- Uses `deno run cli.ts` invocation instead of `deno serve`

As of the current Fresh 2 alpha releases, **there is no built-in or supported way to programmatically start the production Fresh server from within a `deno run` CLI that runs on the compiled assets** because the Fresh server lifecycle and routing are tightly coupled with how `deno serve` manages the runtime and server process[2][4].

### Suggested approaches given current limitations:

1. **Spawn `deno serve` from your CLI:** In your CLI (`cli.ts`), when you want to start the Fresh server, you could spawn a child process to run the equivalent of:
   ```bash
   deno serve _fresh/main.js
   ```
   This way you keep your CLI able to work both in modes:
   - Without starting the server (just CLI logic)
   - With starting the server by launching the proper `deno serve` subcommand.

2. **Separate CLI from server startup:** Use your CLI for commands that don't start a server (running under `deno run cli.ts`), and use a separate startup for production with `deno serve _fresh/main.js` according to Fresh docs.

3. **Monitor Fresh and Deno CLI updates:** The Fresh 2 ecosystem and Deno CLI are actively evolving. There are ongoing discussions and issues (like HMR support and CLI improvements) that might enable more integrated ways in future Fresh or Deno releases, but currently, it looks like manual use of `deno serve` is the recommended and only stable approach for production[9].

### Summary

- You **cannot run the Fresh 2 production server via `deno run cli.ts` directly on the compiled `_fresh` assets** without errors.
- Production mode mandates `deno serve` for runtime server management.
- Your CLI can spawn `deno serve` as a subprocess if you want programmatic control.
- Fresh 2 alpha releases do not yet provide a way to embed this server start inside a single CLI launched with `deno run`.

If you want, I can help you with example code to spawn `deno serve` from a Deno CLI program or guide you on structuring your project to separate CLI commands and server startup. Would that be helpful?

[1] https://docs.deno.com/runtime/getting_started/command_line_interface/
[2] https://questions.deno.com/m/1265778765573918760
[3] https://reverentgeek.com/build-a-command-line-application-with-deno-2/
[4] https://docs.deno.com/runtime/reference/cli/serve/
[5] https://rodneylab.com/getting-started-deno-fresh/
[6] https://stackoverflow.com/questions/62081683/how-to-use-deno-in-production
[7] https://deno.com/blog/v2.0-release-candidate
[8] https://github.com/denoland/deno/discussions/19432
[9] https://github.com/denoland/fresh/issues/2363
[10] https://github.com/denoland/deno/issues/25305

---

Is it possible to start a background service with Deno 2 using Fresh 2 in serve mode (`deno serve -A _fresh/server.js`)? Will this `_fresh/server.js` contain all code or just the routes/frontend?

If this works, I guess it should configure the production service via environment variables/`.env` files instead of a CLI interface, I guess?

And keep the CLI for development/testing/etc only?

---

Yes, it is possible to start a background service with Deno 2 using Fresh 2 in serve mode by running a command like:

```bash
deno serve -A _fresh/server.js
```

The `_fresh/server.js` file contains the compiled production server code, which includes all necessary backend logic such as routing and server-side rendering; it is not limited to just frontend routes. This file is generated as part of your build output and is optimized for running with `deno serve`. So, it represents the full production server.

Regarding production configuration, best practice is indeed to configure the server via environment variables or `.env` files (using appropriate environment loading libraries if needed), rather than through a CLI interface. This aligns with typical server deployment patterns where the executable runs as a stateless service configured by environment.

Consequently, it makes sense to keep your CLI commands focused on development, testing, or auxiliary tooling, and have the production server run independently in serve mode as outlined, configured by environment variables for things like port, database URLs, API keys, and so forth.

This approach matches the current Fresh 2 architecture and deployment model:

- **`deno serve _fresh/server.js`** runs the full production server.
- Configuration via environment variables or `.env` files.
- CLI (`deno run cli.ts`) is mainly for development, management, or non-server tasks.

This pattern ensures a clean separation between development/testing tools and the deployed production service, which improves maintainability and simplifies deployments.

Sources indicate Fresh 2 emphasizes this split and does not embed the production server start inside CLI code run by `deno run` directly, reinforcing this recommended usage pattern[1][4].

[1] https://fresh.deno.dev/docs/canary/examples/migration-guide
[2] https://fenilsonani.com/articles/deno-2-fresh-framework-guide
[3] https://deno.com/blog/deno-in-2024
[4] https://deno.com/blog/an-update-on-fresh
[5] https://fresh.deno.dev
[6] https://github.com/denoland/fresh/issues/2363
[7] https://deno.com/blog/v2.0
[8] https://dev.to/googlecloud/create-a-blog-with-deno-2-and-fresh-1lj4
[9] https://docs.deno.com/runtime/getting_started/setup_your_environment/