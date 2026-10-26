import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = readFileSync(path.join(packageRoot, "prisma", "schema.prisma"), "utf8");
const hasModel = /^\s*model\s+\w+/m.test(schema);

if (!hasModel) {
  console.log(
    "No models in schema yet; skipping migrate. Run again after the source schema is added.",
  );
  process.exit(0);
}

const result = spawnSync("prisma", ["migrate", "dev"], {
  cwd: packageRoot,
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
