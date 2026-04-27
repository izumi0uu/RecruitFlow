import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDatabaseConfig, loadRootEnv } from "@recruitflow/config";
import * as schema from "@/lib/db/schema";

loadRootEnv();

const { connectionString } = getDatabaseConfig();

const createClient = () =>
  postgres(connectionString, {
    idle_timeout: 20,
    max: process.env.NODE_ENV === "production" ? 10 : 1,
    max_lifetime: 60 * 30,
  });

const createDatabase = (sql: ReturnType<typeof postgres>) =>
  drizzle(sql, { schema });

const globalForDb = globalThis as typeof globalThis & {
  recruitFlowDb?: ReturnType<typeof createDatabase>;
  recruitFlowPostgresClient?: ReturnType<typeof postgres>;
};

export const client = globalForDb.recruitFlowPostgresClient ?? createClient();
export const db = globalForDb.recruitFlowDb ?? createDatabase(client);

if (process.env.NODE_ENV !== "production") {
  globalForDb.recruitFlowPostgresClient = client;
  globalForDb.recruitFlowDb = db;
}
