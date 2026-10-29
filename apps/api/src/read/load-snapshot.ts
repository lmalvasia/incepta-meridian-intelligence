import { createDb } from "@meridian/db";
import type { BillingSystemName, IssueSeverityName, LinkStatusName } from "@meridian/domain";
import type { Snapshot } from "../types/snapshot.js";
import { collapsedCopies } from "./collapsed-copies.js";
import { issueSubject } from "./issue-subject.js";
import { isoDate } from "./iso-date.js";

export async function loadSnapshot(): Promise<Snapshot> {
  const db = createDb();
  try {
    const [customers, invoices, notes, contracts, issues, copies] = await Promise.all([
      db.customer.findMany(),
      db.invoice.findMany(),
      db.accountNote.findMany(),
      db.contract.findMany(),
      db.dataQualityIssue.findMany(),
      collapsedCopies(),
    ]);
    const sourceByCustomer = new Map(customers.map((customer) => [customer.id, customer.sourceId]));
    const labels = {
      customers: new Map(customers.map((customer) => [customer.id, `${customer.sourceId} ${customer.displayName}`])),
      invoices: new Map(invoices.map((invoice) => [invoice.id, invoice.sourceInvoiceId])),
      contracts: new Map(contracts.map((contract) => [contract.id, contract.sourceContractId])),
      notes: new Map(notes.map((note) => [note.id, note.sourceNoteId])),
    };
    return {
      customers: customers.map((customer) => ({
        sourceId: customer.sourceId,
        displayName: customer.displayName,
        accountManager: customer.accountManager,
        accountStatus: customer.accountStatus,
      })),
      invoices: invoices.map((invoice) => ({
        sourceInvoiceId: invoice.sourceInvoiceId,
        billingSystem: invoice.billingSystem as BillingSystemName,
        invoiceDate: isoDate(invoice.invoiceDate),
        status: invoice.status,
        customerRef: invoice.customerRef,
        amount: decimal(invoice.amount),
        serviceLine: invoice.serviceLine,
        linkStatus: invoice.linkStatus as LinkStatusName,
        linkReason: invoice.linkReason,
        customerSourceId: invoice.customerId === null ? null : (sourceByCustomer.get(invoice.customerId) ?? null),
      })),
      notes: notes.map((note) => ({
        sourceNoteId: note.sourceNoteId,
        noteDate: isoDate(note.noteDate),
        noteText: note.noteText,
        linkStatus: note.linkStatus as LinkStatusName,
        customerSourceId: note.customerId === null ? null : (sourceByCustomer.get(note.customerId) ?? null),
      })),
      contracts: contracts.map((contract) => ({
        sourceContractId: contract.sourceContractId,
        customerRef: contract.customerRef,
        startDate: isoDate(contract.startDate),
        endDate: isoDate(contract.endDate),
        autoRenew: contract.autoRenew,
        customerSourceId: contract.customerId === null ? null : (sourceByCustomer.get(contract.customerId) ?? null),
      })),
      issues: issues.map((issue) => ({
        code: issue.code,
        severity: issue.severity as IssueSeverityName,
        description: issue.description,
        amountImpact: issue.amountImpact === null ? null : decimal(issue.amountImpact),
        subject: issueSubject(issue, labels),
      })),
      collapsedCopies: copies,
    };
  } finally {
    await db.$disconnect();
  }
}

function decimal(value: { toString(): string }): string {
  return value.toString();
}
