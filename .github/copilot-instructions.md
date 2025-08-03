# Project Overview

This project tracks changes to the public OpenRouter model list via API. Is uses Deno with Fresh as frontend and SQLite for data storage.

## Folder Structure (root)

- `data`: Contains live production data like database, log files, automatic backups. Used for generating seed images. Do not touch files inside this folder.
- `docs`: Contains design documents.
- `service`: systemd service files and installation scripts.
- `Makefile`: central Makefile for container orchestration.
- `compose.yaml`: Docker/Podman compose file.
- `Containerfile`: Minimal Dockerfile for seed generation.

NOTE: Documentation `*.md` files in the folder `docs/` need to be treated carefully. While deeper concepts mentioned in those documents are still valid, files and folders mentioned in those `docs/*.md` files may not exist anymore, some may have been moved, some may have been deleted/refactored/etc.

## Folder Structure (app)

- `orw-deno`: The main Deno app with the watcher. Inside this folder the structure looks like the following:
- `orw-deno/_fresh`: Contains generated (compiled) Fresh artifacts. This folder may not exist and can most get ignored.
- `orw-deno/components`: Contains Fresh components.
- `orw-deno/islands`: Contains Fresh islands.
- `orw-deno/lib`: Contains shared utility code and type definitions.
- `orw-deno/routes`: Contains Fresh routes.
- `orw-deno/server`: Contains the backend watcher and database logic for tracking changes to the OpenRouter model list.
- `orw-deno/static`: Contains static files for the frontend.
- `orw-deno/tests`: Contains all test scripts (currently empty, skip testing for now).

## Notable Files in `orw-deno`

- `orw-deno/main.ts`: Contains the Fresh startup script for production, cannot be invoked directly, see documentation for details.
- `orw-deno/utils.ts`: Contains application middleware define helper and state type definitions.
- `orw-deno/dev.ts`: Contains the Fresh startup script for development, can get invoked directly.
- `orw-deno/deno.json`: Contains Deno configuration, tasks, import aliases, etc.
- `orw-deno/.env`: Contains environment variable settings for production, do not touch this file if it exists.
- `orw-deno/.env.example`: Contains example environment variable settings.
- `orw-deno/Congtainerfile`: Main Dockerfile for building the containerized app.

## Libraries and Frameworks

- Deno 2
- Fresh 2 canary
- TailwindCSS 4
- DaisyUI 5

NOTE: Please consult online documentation for updated information, if not provided inside this prompt, do not trust your knowledge about those tools mentioned above, it is very likely out-of-date and obsolete.

## UI Guidelines

- Application should have a modern and clean design.
- Use DaisyUI for styling (it uses TailwindCSS internally).
- The navigation bar on top contains:
  - Left: Main navigation links to the models/changes/remove lists.
  - Middle: Filter input box for client-side on-the-fly filtering models.
  - Right: Status information like last db change, last API check, number of models, version.
- The main content block below the navigation bar contains either:
  - Model list as a large, responsive table view (latest model first by default).
  - List of changes (newest first).

## Tool Use

Use playwright MCP server to access the application via browser and test implementations, also check the browser console log for errors.

Use filesystem MCP server to move and delete files if needed. Do not forget to remove backup files you created.

## Development Server

Assume that a development server is always running and accessible via http://localhost:8000/
Do not try to start a server on your own.

## Linting and Testing

Run `make pre` in the repository root to check for type errors, lint and format source code. A successful `make pre` run is a requirement before committing to the repository.

Assume your code works. There are currently no automated test scripts available. I will test manually and give you useful feedback to cover integration testing.
