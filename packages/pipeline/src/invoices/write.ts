import type { Tx } from "../import/types.js";
import { createIssues } from "../import/issues.js";
import { utcDate } from "../utils/dates.js";
import { CHUNK, chunks } from "../utils/batch.js";
import { customerIdFor } from "../customers/write.js";
import type { InvoiceDraft } from "./types.js";

export async function writeInvoices(
  tx: Tx,
  drafts: readonly InvoiceDraft[],
  customerIds: ReadonlyMap<string, string>,
): Promise<void> {
  if (drafts.length === 0) {
    return;
  }

  const existing = await tx.invoice.findMany({
    where: { OR: invoiceFilters(drafts) },
    select: { id: true },
  });
  const existingIds = existing.map((row) => row.id);
  if (existingIds.length > 0) {
    await tx.dataQualityIssue.deleteMany({ where: { invoiceId: { in: existingIds } } });
    await tx.invoice.deleteMany({ where: { id: { in: existingIds } } });
  }

  for (const chunk of chunks(drafts, CHUNK)) {
    await tx.invoice.createMany({
      data: chunk.map((draft) => ({
        billingSystem: draft.billingSystem,
        sourceInvoiceId: draft.sourceInvoiceId,
        invoiceDate: utcDate(draft.invoiceDate),
        status: draft.status,
        customerRef: draft.customerRef,
        amount: draft.amount,
        currency: draft.currency,
        memo: draft.memo,
        serviceLine: draft.serviceLine,
        customerId: customerIdFor(draft.link, customerIds),
        linkStatus: draft.link.status,
        linkReason: draft.link.reason,
      })),
    });
  }

  const stored = await tx.invoice.findMany({
    where: { OR: invoiceFilters(drafts) },
    select: { id: true, billingSystem: true, sourceInvoiceId: true },
  });
  const ids = new Map(stored.map((row) => [`${row.billingSystem}\0${row.sourceInvoiceId}`, row.id]));
  await createIssues(
    tx,
    drafts.flatMap((draft) => {
      const invoiceId = ids.get(`${draft.billingSystem}\0${draft.sourceInvoiceId}`);
      if (invoiceId === undefined) {
        throw new Error(`Invoice ${draft.sourceInvoiceId} was not stored.`);
      }
      return draft.issues.map((issue) => ({ invoiceId, issue }));
    }),
  );
}

function invoiceFilters(drafts: readonly InvoiceDraft[]) {
  const quickbooks = drafts.filter((draft) => draft.billingSystem === "quickbooks").map((draft) => draft.sourceInvoiceId);
  const netsuite = drafts.filter((draft) => draft.billingSystem === "netsuite").map((draft) => draft.sourceInvoiceId);
  const filters = [];
  if (quickbooks.length > 0) {
    filters.push({ billingSystem: "quickbooks" as const, sourceInvoiceId: { in: quickbooks } });
  }
  if (netsuite.length > 0) {
    filters.push({ billingSystem: "netsuite" as const, sourceInvoiceId: { in: netsuite } });
  }
  return filters;
}
