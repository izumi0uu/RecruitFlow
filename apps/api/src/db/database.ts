import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDatabaseConfig, loadRootEnv } from "@recruitflow/config";
import * as schema from "@/lib/db/schema";

loadRootEnv();

const { connectionString } = getDatabaseConfig();

export const client = postgres(connectionString);
export const db = drizzle(client, { schema });
