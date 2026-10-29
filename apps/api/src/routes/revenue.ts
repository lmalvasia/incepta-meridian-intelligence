import { revenueResponseSchema } from "@meridian/contracts";
import { buildRevenue } from "@meridian/domain";
import type { FastifyInstance } from "fastify";
import type { AppContext } from "../composition.js";

export function registerRevenue(app: FastifyInstance, context: AppContext): void {
  app.get("/revenue", async () => {
    const snapshot = await context.loadSnapshot();
    return revenueResponseSchema.parse(buildRevenue(snapshot.invoices, snapshot.collapsedCopies));
  });
}
