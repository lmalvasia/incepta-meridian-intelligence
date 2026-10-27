import { linkCustomerName } from "../customers/matching.js";
import type { CrmParty } from "../customers/types.js";
import type { FilePlan, SkippedRow, SourceText } from "../import/types.js";
import { parseDate } from "../utils/dates.js";
import { invalidRow, IssueCode, missingFields, repeatedHeaderIssue, unexpectedValue, type IssueDraft } from "../utils/issues.js";
import { formatDecimal, parseMoney } from "../utils/money.js";
import { collapsedAmounts, finishFile, parseSource, rowRecord } from "../utils/plan.js";
import { collapseRows, conflictIssue, conflictSkips, isBlank, isRepeatedHeader } from "../utils/rows.js";
import type { InvoiceDraft } from "./types.js";

const QUICKBOOKS_STATUSES = new Set(["Paid", "Open", "Overdue"]);

function dateIssue(reason: string): IssueDraft {
  return {
    code: IssueCode.invalidDate,
    severity: "error",
    description: `${reason} The row was not stored as an invoice.`,
    amountImpact: null,
  };
}

export function classifyQuickBooks(input: SourceText, parties: readonly CrmParty[]): FilePlan {
  const table = parseSource(input, "invoices_2024_quickbooks.csv");
  const groups = collapseRows(table.rows, table.headers, (row) => {
    if (row.cells.length !== table.headers.length) {
      return null;
    }
    const record = rowRecord(table.headers, row);
    if (isRepeatedHeader(table.headers, row.cells)) {
      return "Invoice No";
    }
    if (isBlank(record["Invoice No"]) && (record.Customer ?? "").trim() === "TOTAL") {
      return "TOTAL";
    }
    const invoiceId = record["Invoice No"] ?? "";
    return isBlank(invoiceId) ? null : invoiceId;
  });

  const skipped: SkippedRow[] = [];
  const invoices: InvoiceDraft[] = [];
  const rejectedFirst = new Set<string>();
  let totalSkip: SkippedRow | undefined;
  let totalAmount = "";

  for (const group of groups) {
    const record = rowRecord(table.headers, group.row);
    const issues: IssueDraft[] = [];
    const columnMismatch = group.row.cells.length !== table.headers.length;
    const repeated = !columnMismatch && isRepeatedHeader(table.headers, group.row.cells);
    const total = !columnMismatch && !repeated && group.key === "TOTAL";
    if (columnMismatch) {
      issues.push(invalidRow(group.row.cells.length, table.headers.length));
    }
    if (repeated) {
      issues.push(repeatedHeaderIssue("an invoice"));
    }
    const conflict = conflictIssue(group);
    if (conflict !== null) {
      issues.push(conflict);
    }
    skipped.push(...conflictSkips(group));

    let draft: InvoiceDraft | undefined;
    if (!columnMismatch && !repeated && !total) {
      draft = quickBooksInvoice(record, issues);
    }

    if (draft === undefined) {
      rejectedFirst.add(group.key);
      const row = { key: group.key, issues };
      skipped.push(row);
      if (total) {
        totalSkip = row;
        totalAmount = record.Amount ?? "";
      }
      continue;
    }

    invoices.push(draft);
  }

  if (totalSkip !== undefined) {
    totalSkip.issues.push(reconciliationIssue(totalAmount, invoices));
  }

  linkQuickBooksNames(invoices, parties);
  return finishFile(
    input,
    table.rows.length,
    groups,
    rejectedFirst,
    skipped,
    collapsedAmounts(groups, (payload) => payload.Amount),
    { invoices },
  );
}

function quickBooksInvoice(record: Record<string, string>, issues: IssueDraft[]): InvoiceDraft | undefined {
  const missing: string[] = [];
  const invoiceId = record["Invoice No"] ?? "";
  const customer = record.Customer ?? "";
  const status = record.Status ?? "";
  if (isBlank(invoiceId)) {
    missing.push("Invoice No");
  }
  if (isBlank(customer)) {
    missing.push("Customer");
  }
  if (isBlank(status)) {
    missing.push("Status");
  }

  const parsedDate = parseDate(record["Invoice Date"] ?? "");
  const parsedAmount = parseMoney(record.Amount ?? "");
  if (parsedDate.kind === "blank") {
    missing.push("Invoice Date");
  }
  if (parsedAmount.kind === "blank") {
    missing.push("Amount");
  }
  if (missing.length > 0) {
    issues.push(missingFields(missing));
  }
  if (parsedDate.kind === "invalid") {
    issues.push(dateIssue(parsedDate.reason));
  }
  if (parsedAmount.kind === "invalid") {
    issues.push({
      code: IssueCode.invalidAmount,
      severity: "error",
      description: `${parsedAmount.reason} The row was not stored as an invoice.`,
      amountImpact: null,
    });
  }

  if (parsedDate.kind !== "date" || parsedAmount.kind !== "amount" || missing.length > 0) {
    return undefined;
  }

  if (!QUICKBOOKS_STATUSES.has(status)) {
    issues.push(unexpectedValue("Status", status, IssueCode.unexpectedStatus));
  }

  return {
    billingSystem: "quickbooks",
    sourceInvoiceId: invoiceId,
    invoiceDate: parsedDate.iso,
    status,
    customerRef: customer,
    amount: parsedAmount.decimal,
    currency: null,
    memo: isBlank(record.Memo) ? null : (record.Memo ?? null),
    serviceLine: null,
    link: { status: "unmatched", customerSourceId: null, reason: "" },
    issues,
  };
}

function reconciliationIssue(rawAmount: string, invoices: readonly InvoiceDraft[]): IssueDraft {
  const parsed = parseMoney(rawAmount);
  const invoiceCents = invoices.reduce((total, invoice) => {
    const money = parseMoney(invoice.amount);
    return money.kind === "amount" ? total + money.cents : total;
  }, 0n);

  if (parsed.kind !== "amount") {
    return {
      code: IssueCode.reconciliationTotal,
      severity: "error",
      description: `TOTAL amount ${parsed.kind === "invalid" ? parsed.reason : "is blank"}. The row was not stored as an invoice.`,
      amountImpact: null,
    };
  }

  const matches = parsed.cents === invoiceCents;
  return {
    code: IssueCode.reconciliationTotal,
    severity: matches ? "info" : "error",
    description: matches
      ? `TOTAL ${parsed.decimal} matches the sum of parsed QuickBooks invoices. The row was not stored as an invoice.`
      : `TOTAL is ${parsed.decimal} but parsed invoices sum to ${formatDecimal(invoiceCents)}. The row was not stored as an invoice.`,
    amountImpact: parsed.decimal,
  };
}

function linkQuickBooksNames(invoices: InvoiceDraft[], parties: readonly CrmParty[]): void {
  const byName = new Map<string, InvoiceDraft[]>();
  for (const invoice of invoices) {
    const list = byName.get(invoice.customerRef) ?? [];
    list.push(invoice);
    byName.set(invoice.customerRef, list);
  }

  for (const [name, rows] of byName) {
    const decision = linkCustomerName(
      name,
      rows.map((row) => ({ issues: row.issues, sortKey: row.sourceInvoiceId })),
      parties,
    );
    for (const row of rows) {
      row.link = decision;
    }
  }
}
