import { resolveSourceId } from "../customers/matching.js";
import type { CrmParty } from "../customers/types.js";
import type { FilePlan, SkippedRow, SourceText } from "../import/types.js";
import { parseDate } from "../utils/dates.js";
import { invalidRow, IssueCode, missingFields, repeatedHeaderIssue, unexpectedValue, type IssueDraft } from "../utils/issues.js";
import { parseMoney } from "../utils/money.js";
import { collapsedAmounts, finishFile, parseSource, rowRecord } from "../utils/plan.js";
import { collapseRows, conflictIssue, conflictSkips, isBlank, isRepeatedHeader } from "../utils/rows.js";
import type { InvoiceDraft } from "./types.js";

const NETSUITE_STATUSES = new Set(["paid", "open", "void"]);
const SERVICE_LINES = new Set(["Preventive Maintenance", "Repair", "Emergency Service", "Project/Install"]);

function dateIssue(reason: string): IssueDraft {
  return {
    code: IssueCode.invalidDate,
    severity: "error",
    description: `${reason} The row was not stored as an invoice.`,
    amountImpact: null,
  };
}

export function classifyNetSuite(input: SourceText, parties: readonly CrmParty[]): FilePlan {
  const table = parseSource(input, "invoices_2025_2026_netsuite.csv");
  const crmIds = new Set(parties.map((party) => party.sourceId));
  const groups = collapseRows(table.rows, table.headers, (row) => {
    if (row.cells.length !== table.headers.length) {
      return null;
    }
    if (isRepeatedHeader(table.headers, row.cells)) {
      return "invoice_id";
    }
    const invoiceId = rowRecord(table.headers, row).invoice_id ?? "";
    return isBlank(invoiceId) ? null : invoiceId;
  });

  const skipped: SkippedRow[] = [];
  const invoices: InvoiceDraft[] = [];
  const rejectedFirst = new Set<string>();

  for (const group of groups) {
    const record = rowRecord(table.headers, group.row);
    const issues: IssueDraft[] = [];
    const columnMismatch = group.row.cells.length !== table.headers.length;
    const repeated = !columnMismatch && isRepeatedHeader(table.headers, group.row.cells);
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

    const draft = !columnMismatch && !repeated ? netSuiteInvoice(record, issues) : undefined;
    if (draft === undefined) {
      rejectedFirst.add(group.key);
      skipped.push({ key: group.key, issues });
      continue;
    }
    invoices.push(draft);
  }

  linkNetSuiteRefs(invoices, crmIds);
  return finishFile(
    input,
    table.rows.length,
    groups,
    rejectedFirst,
    skipped,
    collapsedAmounts(groups, (payload) => payload.amount_usd),
    { invoices },
  );
}

function netSuiteInvoice(record: Record<string, string>, issues: IssueDraft[]): InvoiceDraft | undefined {
  const missing: string[] = [];
  const invoiceId = record.invoice_id ?? "";
  const customerRef = record.customer_ref ?? "";
  const status = record.status ?? "";
  if (isBlank(invoiceId)) {
    missing.push("invoice_id");
  }
  if (isBlank(customerRef)) {
    missing.push("customer_ref");
  }
  if (isBlank(status)) {
    missing.push("status");
  }

  const parsedDate = parseDate(record.txn_date ?? "");
  const parsedAmount = parseMoney(record.amount_usd ?? "");
  if (parsedDate.kind === "blank") {
    missing.push("txn_date");
  }
  if (parsedAmount.kind === "blank") {
    missing.push("amount_usd");
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

  if (!NETSUITE_STATUSES.has(status)) {
    issues.push(unexpectedValue("status", status, IssueCode.unexpectedStatus));
  }

  const currency = currencyOf(record.currency ?? "", issues);
  const serviceRaw = record.service_line ?? "";
  let serviceLine: string | null = null;
  if (isBlank(serviceRaw)) {
    issues.push({
      code: IssueCode.blankServiceLine,
      severity: "warning",
      description: "service_line is blank. No service line was stored.",
      amountImpact: null,
    });
  } else {
    serviceLine = serviceRaw;
    if (!SERVICE_LINES.has(serviceRaw)) {
      issues.push(unexpectedValue("service_line", serviceRaw, IssueCode.unexpectedServiceLine));
    }
  }

  return {
    billingSystem: "netsuite",
    sourceInvoiceId: invoiceId,
    invoiceDate: parsedDate.iso,
    status,
    customerRef,
    amount: parsedAmount.decimal,
    currency,
    memo: null,
    serviceLine,
    link: { status: "unmatched", customerSourceId: null, reason: "" },
    issues,
  };
}

function currencyOf(raw: string, issues: IssueDraft[]): string | null {
  if (isBlank(raw)) {
    issues.push({
      code: IssueCode.blankCurrency,
      severity: "warning",
      description: "currency is blank. No currency was stored.",
      amountImpact: null,
    });
    return null;
  }
  if (!/^[A-Za-z]{3}$/.test(raw)) {
    issues.push({
      code: IssueCode.unexpectedCurrency,
      severity: "warning",
      description: `currency "${raw}" is not a 3-letter code. No currency was stored.`,
      amountImpact: null,
    });
    return null;
  }
  if (raw !== "USD") {
    issues.push({
      code: IssueCode.unexpectedCurrency,
      severity: "warning",
      description: `currency "${raw}" was stored and was not converted.`,
      amountImpact: null,
    });
  }
  return raw;
}

function linkNetSuiteRefs(invoices: InvoiceDraft[], crmIds: ReadonlySet<string>): void {
  const byRef = new Map<string, InvoiceDraft[]>();
  for (const invoice of invoices) {
    const list = byRef.get(invoice.customerRef) ?? [];
    list.push(invoice);
    byRef.set(invoice.customerRef, list);
  }

  for (const [customerRef, rows] of byRef) {
    const known = crmIds.has(customerRef);
    const decision = resolveSourceId(
      customerRef,
      known,
      `NetSuite customer_ref ${customerRef} equals CRM customer_id ${customerRef}.`,
    );
    for (const row of rows) {
      row.link = decision;
    }
    if (known) {
      continue;
    }
    const earliest = [...rows].sort((left, right) => left.sourceInvoiceId.localeCompare(right.sourceInvoiceId))[0];
    earliest?.issues.push({
      code: IssueCode.unknownCustomerRef,
      severity: "warning",
      description: decision.reason,
      amountImpact: null,
    });
  }
}
