import type { Config } from "drizzle-kit";

import { getDatabaseConfig, loadRootEnv } from "@recruitflow/config";

loadRootEnv();

const { connectionString } = getDatabaseConfig();

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  connectionString,
} satisfies Config;
