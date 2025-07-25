// test/cli-isolated.test.ts - CLI tests with isolated environment
import { assertEquals, assertStringIncludes } from "@std/assert";
import { createTestServerContext } from "./helpers/test-setup.ts";

/**
 * Helper to run CLI command with isolated environment
 */
async function runCLIWithIsolatedEnv(args: string[], tempDir: string): Promise<{
  stdout: string;
  stderr: string;
  code: number;
}> {
  const cmd = new Deno.Command("deno", {
    args: ["run", "--allow-all", "cli.ts", ...args],
    env: {
      ...Deno.env.toObject(),
      ORW_DATA_PATH: tempDir,
      NODE_ENV: "test",
    },
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await cmd.output();

  return {
    stdout: new TextDecoder().decode(stdout),
    stderr: new TextDecoder().decode(stderr),
    code,
  };
}

/**
 * Test CLI help command
 */
Deno.test("CLI - Help Command", async () => {
  const context = await createTestServerContext();

  try {
    const result = await runCLIWithIsolatedEnv(["--help"], context.tempDir);

    assertEquals(result.code, 0, "Help should exit with code 0");
    assertStringIncludes(result.stdout, "OpenRouter Watcher", "Should show app name");
    assertStringIncludes(result.stdout, "--init", "Should show init option");
    assertStringIncludes(result.stdout, "--serve", "Should show serve option");
  } finally {
    await context.cleanup();
  }
});

/**
 * Test CLI init command
 */
Deno.test("CLI - Init Command (Isolated)", async () => {
  const context = await createTestServerContext();

  try {
    const result = await runCLIWithIsolatedEnv(["--init"], context.tempDir);

    console.log("Init command stdout:", result.stdout);
    console.log("Init command stderr:", result.stderr);
    console.log("Init command exit code:", result.code);

    assertEquals(result.code, 0, `Init should exit with code 0. Stderr: ${result.stderr}`);
    assertStringIncludes(result.stdout, "Database initialized", "Should show initialization");
    assertStringIncludes(result.stdout, "successfully", "Should complete successfully");

    // Verify database file was created
    const dbPath = `${context.tempDir}/orw.db`;
    const stat = await Deno.stat(dbPath);
    assertEquals(stat.isFile, true, "Database file should be created");
  } finally {
    await context.cleanup();
  }
});

/**
 * Test CLI query command
 */
Deno.test("CLI - Query Command (Isolated)", async () => {
  const context = await createTestServerContext();

  try {
    // First initialize the database (this should now work)
    const initResult = await runCLIWithIsolatedEnv(["--init"], context.tempDir);
    assertEquals(
      initResult.code,
      0,
      `Init should succeed before query. Stderr: ${initResult.stderr}`,
    );

    // Then query it with the same temp directory
    const result = await runCLIWithIsolatedEnv(["--query", "5"], context.tempDir);

    console.log("Query command stdout:", result.stdout);
    console.log("Query command stderr:", result.stderr);
    console.log("Query command exit code:", result.code);

    assertEquals(result.code, 0, `Query should exit with code 0. Stderr: ${result.stderr}`);
    assertStringIncludes(result.stdout, "Showing 5 most recent changes", "Should show query info");
  } finally {
    await context.cleanup();
  }
});

/**
 * Test CLI with different data directories
 */
Deno.test("CLI - Data Directory Isolation", async () => {
  const context1 = await createTestServerContext();
  const context2 = await createTestServerContext();

  try {
    // Initialize both with different data
    const result1 = await runCLIWithIsolatedEnv(["--init"], context1.tempDir);
    const result2 = await runCLIWithIsolatedEnv(["--init"], context2.tempDir);

    assertEquals(result1.code, 0, "First init should succeed");
    assertEquals(result2.code, 0, "Second init should succeed");

    // Verify separate database files
    const db1 = await Deno.stat(`${context1.tempDir}/orw.db`);
    const db2 = await Deno.stat(`${context2.tempDir}/orw.db`);

    assertEquals(db1.isFile, true, "First database should exist");
    assertEquals(db2.isFile, true, "Second database should exist");

    // They should be different files
    assertEquals(context1.tempDir !== context2.tempDir, true, "Should use different directories");
  } finally {
    await Promise.all([
      context1.cleanup(),
      context2.cleanup(),
    ]);
  }
});
