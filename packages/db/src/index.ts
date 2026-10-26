import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

export function createDb(
  databaseUrl: string | undefined = process.env["DATABASE_URL"],
): PrismaClient {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 2_000,
    max: 1,
  });
  return new PrismaClient({ adapter });
}

export async function checkDatabase(databaseUrl?: string): Promise<void> {
  const db = createDb(databaseUrl);

  try {
    await db.$queryRaw`SELECT 1`;
  } finally {
    await db.$disconnect();
  }
}
