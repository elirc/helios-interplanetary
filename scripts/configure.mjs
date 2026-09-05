import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";

try {
  const example = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  const content = example.replace(
    "replace-with-a-random-string-of-at-least-32-characters",
    randomBytes(32).toString("hex"),
  );
  await writeFile(new URL("../.env", import.meta.url), content, { flag: "wx" });
  console.log("Created .env with a random local session secret.");
} catch (error) {
  if (error.code === "EEXIST") console.log("Existing .env preserved.");
  else throw error;
}
