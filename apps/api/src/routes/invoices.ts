import { accountInvoicesResponseSchema } from "@meridian/contracts";
import { contractsForAccount, invoicesForAccount } from "@meridian/domain";
import type { FastifyInstance } from "fastify";
import type { AppContext } from "../composition.js";

export function registerInvoices(app: FastifyInstance, context: AppContext): void {
  app.get<{ Params: { sourceId: string } }>("/customers/:sourceId/invoices", async (request, reply) => {
    const snapshot = await context.loadSnapshot();
    const sourceId = request.params.sourceId;
    const customer = snapshot.customers.find((row) => row.sourceId === sourceId);
    const invoices = invoicesForAccount(snapshot.invoices, sourceId);
    if (customer === undefined && invoices.length === 0) {
      return reply.code(404).send({ status: "not_found" });
    }
    return accountInvoicesResponseSchema.parse({
      sourceId,
      displayName: customer?.displayName ?? "",
      contracts: contractsForAccount(snapshot.contracts, snapshot.invoices, sourceId),
      invoices: invoices.map((invoice) => ({
        sourceInvoiceId: invoice.sourceInvoiceId,
        billingSystem: invoice.billingSystem,
        invoiceDate: invoice.invoiceDate,
        status: invoice.status,
        amount: invoice.amount,
        serviceLine: invoice.serviceLine,
        linkStatus: invoice.linkStatus,
      })),
    });
  });
}
