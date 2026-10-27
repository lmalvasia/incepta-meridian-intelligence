import { config } from "dotenv";
import path from "node:path";
import { createDb } from "@meridian/db";
import { formatSummary } from "./import/summary.js";
import { importDirectory } from "./import/write.js";
import { defaultSourceDirectory, findRepoRoot } from "./sources/repo.js";

const root = findRepoRoot(process.cwd());
config({ path: path.join(root, ".env"), quiet: true });

try {
  const db = createDb();
  try {
    const summary = await importDirectory(db, defaultSourceDirectory());
    console.log(formatSummary(summary));
  } finally {
    await db.$disconnect();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
