import cors from "@fastify/cors";
import { healthResponseSchema } from "@meridian/contracts";
import Fastify, { type FastifyInstance } from "fastify";
import type { AppContext } from "./composition.js";
import { registerCustomers } from "./routes/customers.js";
import { registerInvoices } from "./routes/invoices.js";
import { registerQuality } from "./routes/quality.js";
import { registerRevenue } from "./routes/revenue.js";
import { registerRevenueAnalysis } from "./routes/revenue-analysis.js";

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

  registerRevenue(app, context);
  registerCustomers(app, context);
  registerInvoices(app, context);
  registerQuality(app, context);
  registerRevenueAnalysis(app, context);

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
