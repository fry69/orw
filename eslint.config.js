import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tsDoc from "eslint-plugin-tsdoc";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
// import reactCompiler from "eslint-plugin-react-compiler";

export default [
  {
    ignores: [
      ".attic/",
      "backup/",
      "coverage/",
      "**/dist/**",
      "docs/",
      "public/",
      "tools/",
      "unused/",
      "eslint.config.js",
      "vite.config.ts",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    ignores: [],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        global: true,
        vi: true,
        describe: true,
        it: true,
        test: true,
        expect: true,
        beforeEach: true,
        afterEach: true,
        beforeAll: true,
        afterAll: true,
      },
      parser: tsParser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "@typescript-eslint": tsPlugin,
      tsdoc: tsDoc,
      // "react-compiler": reactCompiler,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "tsdoc/syntax": "warn",
      // "react-compiler/react-compiler": "error",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];
