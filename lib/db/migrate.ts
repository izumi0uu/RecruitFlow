import { migrate } from "drizzle-orm/postgres-js/migrator";

import { client, db } from "./drizzle";

const main = async () => {
  await migrate(db, {
    migrationsFolder: "./lib/db/migrations",
  });
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
