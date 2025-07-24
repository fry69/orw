#!/usr/bin/env -S deno run --allow-all
/// <reference lib="deno.ns" />
/**
 * build.ts - React build pipeline for Deno
 * Replaces Vite with a simple Deno-based bundler
 */

import { emptyDir, ensureDir } from "@std/fs";
import { join } from "@std/path";

const BUILD_DIR = "./dist";
const SRC_DIR = "./src";
const PUBLIC_DIR = "./public";

interface BuildOptions {
  watch?: boolean;
  minify?: boolean;
  dev?: boolean;
}

/**
 * Main build function
 */
async function build(options: BuildOptions = {}) {
  console.log("🚀 Starting React build with Deno...");

  try {
    // Clean and create build directory
    await emptyDir(BUILD_DIR);
    await ensureDir(BUILD_DIR);

    // Copy public assets
    await copyPublicAssets();

    // Bundle JavaScript/TypeScript
    await bundleApp(options);

    // Generate index.html
    await generateIndexHtml();

    if (options.watch) {
      console.log("👀 Watching for changes...");
      await watchFiles();
    } else {
      console.log("✅ Build completed successfully!");
    }
  } catch (error) {
    console.error("❌ Build failed:", error);
    Deno.exit(1);
  }
}

/**
 * Copy public assets to build directory
 */
async function copyPublicAssets() {
  console.log("📁 Copying public assets...");

  try {
    for await (const entry of Deno.readDir(PUBLIC_DIR)) {
      if (entry.isFile) {
        const srcPath = join(PUBLIC_DIR, entry.name);
        const destPath = join(BUILD_DIR, entry.name);
        await Deno.copyFile(srcPath, destPath);
      }
    }
  } catch (_error) {
    console.warn("⚠️  No public directory found, skipping assets");
  }
}

/**
 * Bundle the React application
 */
async function bundleApp(options: BuildOptions) {
  console.log("📦 Bundling React application...");

  const entryPoint = join(SRC_DIR, "main.tsx");
  const outputPath = join(BUILD_DIR, "bundle.js");
  // const importMap = 'import_map.json';

  try {
    // Build command arguments - using improved Deno 2.4 bundle with esbuild
    const args = [
      "bundle",
      entryPoint,
      "--output",
      outputPath,
      "--platform",
      "browser",
      // "--import-map",
      // importMap,
      "--reload",
      "--check=all",
    ];

    if (options.minify) {
      args.push("--minify");
    }

    // Add sourcemap for development
    if (options.dev) {
      args.push("--sourcemap");
    }

    console.log("deno bundle args: ", args);
    // Run deno bundle (now with esbuild backend in Deno 2.4!)
    const command = new Deno.Command(Deno.execPath(), {
      args,
      cwd: Deno.cwd(),
    });

    const { code, stderr, stdout } = await command.output();

    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr);
      const outputText = new TextDecoder().decode(stdout);
      console.error("Stderr:", errorText);
      console.error("Stdout:", outputText);
      throw new Error(`Bundle failed: ${errorText}`);
    }

    console.log(`📝 Bundle written to ${outputPath}`);
    // Report bundle size
    const stats = await Deno.stat(outputPath);
    const sizeInKB = (stats.size / 1024).toFixed(2);
    console.log(`📊 Bundle size: ${sizeInKB} KB (${stats.size} bytes)`);
  } catch (error) {
    console.error("❌ Bundling failed:", error);
    throw error;
  }
}

/**
 * Generate index.html with bundled assets
 */
async function generateIndexHtml() {
  console.log("📄 Generating index.html...");

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OpenRouter Watcher</title>
    <link rel="stylesheet" href="/app.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/bundle.js"></script>
  </body>
</html>`;

  await Deno.writeTextFile(join(BUILD_DIR, "index.html"), html);
}

/**
 * Watch for file changes (simple implementation)
 */
async function watchFiles() {
  const watcher = Deno.watchFs([SRC_DIR, PUBLIC_DIR], { recursive: true });

  for await (const event of watcher) {
    if (event.kind === "modify" || event.kind === "create") {
      console.log(`🔄 File changed: ${event.paths.join(", ")}`);
      console.log("🔨 Rebuilding...");

      try {
        await copyPublicAssets();
        await bundleApp({ watch: true });
        await generateIndexHtml();
        console.log("✅ Rebuild completed!");
      } catch (error) {
        console.error("❌ Rebuild failed:", error);
      }
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): BuildOptions {
  const args = Deno.args;
  const options: BuildOptions = {};

  if (args.includes("--watch") || args.includes("-w")) {
    options.watch = true;
  }

  if (args.includes("--dev") || args.includes("-d")) {
    options.dev = true;
  }

  if (args.includes("--minify") || args.includes("-m")) {
    options.minify = true;
  }

  return options;
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
OpenRouter Watcher - React Build Tool

Usage: deno run --allow-all build.ts [options]

Options:
  -w, --watch    Watch for changes and rebuild
  -d, --dev      Development mode (no minification)
  -m, --minify   Force minification
  -h, --help     Show this help

Examples:
  deno run --allow-all build.ts           # Production build
  deno run --allow-all build.ts --dev     # Development build
  deno run --allow-all build.ts --watch   # Watch mode
`);
}

// Main execution
if (import.meta.main) {
  const args = Deno.args;

  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    Deno.exit(0);
  }

  const options = parseArgs();
  await build(options);
}
