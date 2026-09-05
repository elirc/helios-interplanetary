import { getPool } from "../src/server/db";
import { migrate } from "../src/server/migrations";
import { resetFixtures, seed } from "../src/server/fixtures";

const pool = getPool();
const command = process.argv[2];
try {
  if (command === "migrate") await migrate(pool);
  else if (command === "seed") await seed(pool);
  else if (command === "reset") {
    const target = new URL(process.env.DATABASE_URL!);
    if (
      !process.argv.includes("--confirm-disposable") ||
      !["127.0.0.1", "localhost", "[::1]"].includes(target.hostname) ||
      target.pathname !== "/helios"
    )
      throw new Error(
        "Reset requires explicit confirmation and the local helios fixture database.",
      );
    await resetFixtures(pool);
  } else throw new Error("Use migrate, seed, or reset --confirm-disposable.");
  console.log(JSON.stringify({ command, status: "ok" }));
} finally {
  await pool.end();
}
