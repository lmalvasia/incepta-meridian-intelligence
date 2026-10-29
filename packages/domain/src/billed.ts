import type { InvoiceInput } from "./types.js";

export function isVoid(status: string): boolean {
  return status.trim().toLowerCase() === "void";
}

export function inRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

export function billedInvoices(invoices: readonly InvoiceInput[]): InvoiceInput[] {
  return invoices.filter((invoice) => !isVoid(invoice.status));
}
