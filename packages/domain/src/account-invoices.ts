import { sourceIdsIn } from "./ids.js";
import type { InvoiceInput } from "./types.js";

export function invoicesForAccount(invoices: readonly InvoiceInput[], sourceId: string): InvoiceInput[] {
  return invoices.filter((invoice) => belongsToAccount(invoice, sourceId)).sort(newestFirst);
}

function newestFirst(left: InvoiceInput, right: InvoiceInput): number {
  return right.invoiceDate.localeCompare(left.invoiceDate) || left.sourceInvoiceId.localeCompare(right.sourceInvoiceId);
}

function belongsToAccount(invoice: InvoiceInput, sourceId: string): boolean {
  if (invoice.customerSourceId === sourceId) {
    return true;
  }
  if (invoice.linkStatus === "held" && sourceIdsIn(invoice.linkReason).includes(sourceId)) {
    return true;
  }
  return invoice.linkStatus === "unmatched" && invoice.customerRef === sourceId;
}
