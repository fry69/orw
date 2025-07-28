# Project Overview

This project tracks changes to the public OpenRouter model list via API. Is uses Deno with Fresh as frontend and SQLite for data storage.

## Folder Structure

- `_fresh`: Contains generated (compiled) Fresh artifacts.
- `components`: Contains Fresh components.
- `data`: Contains live production data like database, log files, automatic backups. Do not touch files inside this folder.
- `docs`: Contains design documents.
- `islands`: Contains Fresh islands.
- `lib`: Contains shared utility code and type definitions.
- `routes`: Contains Fresh routes.
- `server`: Contains the backend watcher and database logic for tracking changes to the OpenRouter model list.
- `static`: Contains static files for the frontend.
- `tests`: Contains all test scripts.

NOTE: Documentation `*.md` files in the folder `docs/` need to be treated carefully. While deeper concepts mentioned in those documents are still valid, files and folders mentioned in those `docs/*.md` files may not exist anymore, some may have been moved, some may have been deleted/refactored/etc.

## Notable Files

- `main.ts`: Contains the Fresh startup script for production, cannot be invoked directly, see documentation for details.
- `dev.ts`: Contains the Fresh startup script for development, can get invoked directly.
- `deno.json`: Contains Deno configuration, tasks, import aliases, etc.
- `.env`: Contains environment variable settings for production, do not touch this file if it exists.
- `.env.example`: Contains example environment variable settings.

## Libraries and Frameworks

- Deno 2
- Fresh 2 canary
- TailwindCSS 4
- DaisyUI 5

NOTE: Please consult online documentation for updated information, if not provided inside this prompt, do not trust your knowledge about those tools mentioned above, it is very likely out-of-date and obsolete.

## UI guidelines

- Application should have a modern and clean design.
- Use DaisyUI for styling (it uses TailwindCSS internally).
- The navigation bar on top contains:
  - Left: Main navigation links to the models/changes/remove lists.
  - Middle: Filter input box for client-side on-the-fly filtering models.
  - Right: Status information like last db change, last API check, number of models, version.
- The main content block below the navigation bar contains either:
  - Model list as a large, responsive table view (latest model first by default).
  - Paginated list of changes (newest first).
