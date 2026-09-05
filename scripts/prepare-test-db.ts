import assert from "node:assert/strict";
import { Pool } from "pg";
import { migrate } from "../src/server/migrations";
import { seed } from "../src/server/fixtures";

const connectionString = process.env.TEST_DATABASE_URL;
assert.ok(connectionString, "TEST_DATABASE_URL is required.");
const target = new URL(connectionString);
assert.equal(target.pathname, "/helios_test");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(target.hostname));
const pool = new Pool({ connectionString });
try {
  await migrate(pool);
  await seed(pool);
  console.log("Isolated browser database ready.");
} finally {
  await pool.end();
}
