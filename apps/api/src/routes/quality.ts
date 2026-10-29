import { qualityResponseSchema } from "@meridian/contracts";
import { buildQuality } from "@meridian/domain";
import type { FastifyInstance } from "fastify";
import type { AppContext } from "../composition.js";

export function registerQuality(app: FastifyInstance, context: AppContext): void {
  app.get("/quality", async () => {
    const snapshot = await context.loadSnapshot();
    const quality = buildQuality(snapshot.invoices, snapshot.contracts, snapshot.issues);
    return qualityResponseSchema.parse({
      ...quality,
      collapsedCopies: snapshot.collapsedCopies.map((copy) => ({ count: copy.count, amount: copy.amount })),
    });
  });
}
