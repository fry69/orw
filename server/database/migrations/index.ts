import type { DatabaseSync } from "sqlite";

export interface Migration {
  version: number;
  up: (db: DatabaseSync) => void;
}

// Import all migration files
import * as migration001 from "./001-initial-tables.ts";
import * as migration002 from "./002-changes-with-type.ts";
import * as migration003 from "./003-added-removed-tables.ts";
import * as migration004 from "./004-api-check-table.ts";
import * as migration005 from "./005-api-check-status.ts";

// Export all migrations in order
const migrations: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
];

export default migrations;
