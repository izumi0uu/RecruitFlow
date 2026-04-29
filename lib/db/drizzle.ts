// Temporary compatibility bridge:
// legacy web-side modules still import from `lib/db/drizzle`, but the actual
// DB bootstrap now lives under the API runtime boundary.
export { client, db } from "../../apps/api/src/db/database";
