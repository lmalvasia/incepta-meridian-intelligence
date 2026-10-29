import { billedInvoices } from "./billed.js";
import { sourceIdsIn } from "./ids.js";
import { addAmounts } from "./money.js";
import type { ContractInput, InvoiceInput, IssueInput } from "./types.js";

const movingCodes = new Set([
  "ambiguous_customer_name",
  "unmatched_customer_name",
  "unknown_customer_ref",
  "possible_duplicate_customer",
  "end_date_before_start",
]);

export type MovingIssue = {
  kind: "repeated_name" | "no_customer" | "broken_contract";
  label: string;
  amount: string | null;
};

export type StoredIssue = {
  code: string;
  severity: IssueInput["severity"];
  description: string;
  amountImpact: string | null;
  subject: string | null;
};

export type QualityReport = {
  moving: MovingIssue[];
  otherIssues: StoredIssue[];
  otherIssueCount: number;
};

export function buildQuality(
  invoices: readonly InvoiceInput[],
  contracts: readonly ContractInput[],
  issues: readonly IssueInput[],
): QualityReport {
  const billed = billedInvoices(invoices);
  const otherIssues = issues
    .filter((issue) => !movingCodes.has(issue.code))
    .map((issue) => ({
      code: issue.code,
      severity: issue.severity,
      description: issue.description,
      amountImpact: issue.amountImpact,
      subject: issue.subject,
    }))
    .sort((left, right) => left.code.localeCompare(right.code) || (left.subject ?? "").localeCompare(right.subject ?? ""));
  return {
    moving: [...repeatedNames(billed), ...noCustomer(billed), ...brokenContracts(contracts)],
    otherIssues,
    otherIssueCount: otherIssues.length,
  };
}

function repeatedNames(invoices: readonly InvoiceInput[]): MovingIssue[] {
  const groups = new Map<string, InvoiceInput[]>();
  for (const invoice of invoices) {
    if (invoice.linkStatus !== "held") {
      continue;
    }
    const key = sourceIdsIn(invoice.linkReason)
      .slice()
      .sort((left, right) => left.localeCompare(right))
      .join(", ");
    const list = groups.get(key) ?? [];
    list.push(invoice);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([label, rows]) => ({
      kind: "repeated_name" as const,
      label,
      amount: addAmounts(rows.map((row) => row.amount)),
    }));
}

function noCustomer(invoices: readonly InvoiceInput[]): MovingIssue[] {
  const groups = new Map<string, InvoiceInput[]>();
  for (const invoice of invoices) {
    if (invoice.linkStatus !== "unmatched") {
      continue;
    }
    const list = groups.get(invoice.customerRef) ?? [];
    list.push(invoice);
    groups.set(invoice.customerRef, list);
  }
  return [...groups.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([label, rows]) => ({
      kind: "no_customer" as const,
      label,
      amount: addAmounts(rows.map((row) => row.amount)),
    }));
}

function brokenContracts(contracts: readonly ContractInput[]): MovingIssue[] {
  return contracts
    .filter((contract) => contract.endDate < contract.startDate)
    .sort((left, right) => left.sourceContractId.localeCompare(right.sourceContractId))
    .map((contract) => ({
      kind: "broken_contract" as const,
      label: `${contract.sourceContractId} ${contract.customerRef}`,
      amount: null,
    }));
}
