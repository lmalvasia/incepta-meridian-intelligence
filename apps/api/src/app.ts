import cors from "@fastify/cors";
import { healthResponseSchema } from "@meridian/contracts";
import Fastify, { type FastifyInstance } from "fastify";
import type { AppContext } from "./composition.js";

export async function buildApp(
  context: AppContext,
  options?: { logger?: boolean },
): Promise<FastifyInstance> {
  const app = Fastify({ logger: options?.logger ?? false });

  await app.register(cors, {
    origin: "http://localhost:3000",
  });

  app.get("/health", async () => {
    return healthResponseSchema.parse({
      status: "ok",
      service: "api",
    });
  });

  app.get("/ready", async (_request, reply) => {
    try {
      await context.checkDatabase();
      return { status: "ok" };
    } catch {
      return reply.code(503).send({ status: "unavailable" });
    }
  });

  return app;
}
