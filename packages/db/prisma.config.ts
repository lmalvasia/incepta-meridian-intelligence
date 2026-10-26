import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));

loadEnv({ path: path.resolve(packageRoot, "../../.env") });

const databaseUrl =
  process.env["DATABASE_URL"] ?? "postgresql://meridian:meridian@localhost:5432/meridian";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
