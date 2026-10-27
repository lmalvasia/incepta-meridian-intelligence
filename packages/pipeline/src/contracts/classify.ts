import type { CrmParty, LinkDecision } from "../customers/types.js";
import type { FilePlan, SkippedRow, SourceText } from "../import/types.js";
import { parseDate } from "../utils/dates.js";
import { invalidRow, IssueCode, missingFields, repeatedHeaderIssue, unexpectedValue, type IssueDraft } from "../utils/issues.js";
import { parseMoney } from "../utils/money.js";
import { collapsedAmounts, finishFile, parseSource, rowRecord } from "../utils/plan.js";
import { collapseRows, conflictIssue, conflictSkips, isBlank, isRepeatedHeader } from "../utils/rows.js";
import type { ContractDraft } from "./types.js";

const BILLING_FREQUENCIES = new Set(["Monthly", "monthly", "Quarterly"]);
const AUTO_RENEW = new Set(["Yes", "No", "yes"]);
const SERVICE_TIERS = new Set(["Silver", "Bronze", "Gold"]);

export function classifyContracts(input: SourceText, parties: readonly CrmParty[]): FilePlan {
  const table = parseSource(input, "contracts.csv");
  const crmIds = new Set(parties.map((party) => party.sourceId));
  const groups = collapseRows(table.rows, table.headers, (row) => {
    if (row.cells.length !== table.headers.length) {
      return null;
    }
    if (isRepeatedHeader(table.headers, row.cells)) {
      return "contract_id";
    }
    const contractId = rowRecord(table.headers, row).contract_id ?? "";
    return isBlank(contractId) ? null : contractId;
  });

  const skipped: SkippedRow[] = [];
  const contracts: ContractDraft[] = [];
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
      issues.push(repeatedHeaderIssue("a contract"));
    }
    const conflict = conflictIssue(group);
    if (conflict !== null) {
      issues.push(conflict);
    }
    skipped.push(...conflictSkips(group));

    const draft = !columnMismatch && !repeated ? contractFrom(record, issues, crmIds) : undefined;
    if (draft === undefined) {
      rejectedFirst.add(group.key);
      skipped.push({ key: group.key, issues });
      continue;
    }
    contracts.push(draft);
  }

  return finishFile(
    input,
    table.rows.length,
    groups,
    rejectedFirst,
    skipped,
    collapsedAmounts(groups, (payload) => payload.annual_value),
    { contracts },
  );
}

function contractLink(customerRef: string, known: boolean): LinkDecision {
  if (!known) {
    return {
      status: "unmatched",
      customerSourceId: null,
      reason: `Customer ref ${customerRef} has no CRM customer. No customer link was stored.`,
    };
  }
  return {
    status: "linked",
    customerSourceId: customerRef,
    reason: `Contract customer_id ${customerRef} equals CRM customer_id ${customerRef}.`,
  };
}

function contractFrom(
  record: Record<string, string>,
  issues: IssueDraft[],
  crmIds: ReadonlySet<string>,
): ContractDraft | undefined {
  const missing: string[] = [];
  const contractId = record.contract_id ?? "";
  const customerRef = record.customer_id ?? "";
  const billingFrequency = record.billing_frequency ?? "";
  const serviceTier = record.service_tier ?? "";
  if (isBlank(contractId)) {
    missing.push("contract_id");
  }
  if (isBlank(customerRef)) {
    missing.push("customer_id");
  }
  if (isBlank(billingFrequency)) {
    missing.push("billing_frequency");
  }
  if (isBlank(serviceTier)) {
    missing.push("service_tier");
  }

  const start = parseDate(record.start_date ?? "");
  const end = parseDate(record.end_date ?? "");
  if (start.kind === "blank") {
    missing.push("start_date");
  }
  if (end.kind === "blank") {
    missing.push("end_date");
  }
  if (missing.length > 0) {
    issues.push(missingFields(missing));
  }
  if (start.kind === "invalid") {
    issues.push({
      code: IssueCode.invalidDate,
      severity: "error",
      description: `${start.reason} The row was not stored as a contract.`,
      amountImpact: null,
    });
  }
  if (end.kind === "invalid") {
    issues.push({
      code: IssueCode.invalidDate,
      severity: "error",
      description: `${end.reason} The row was not stored as a contract.`,
      amountImpact: null,
    });
  }

  const annual = parseMoney(record.annual_value ?? "");
  if (annual.kind === "invalid") {
    issues.push({
      code: IssueCode.invalidAmount,
      severity: "error",
      description: `${annual.reason} The row was not stored as a contract.`,
      amountImpact: null,
    });
  }

  if (start.kind !== "date" || end.kind !== "date" || annual.kind === "invalid" || missing.length > 0) {
    return undefined;
  }

  if (start.iso > end.iso) {
    issues.push({
      code: IssueCode.endDateBeforeStart,
      severity: "warning",
      description: `Contract ${contractId} has end date ${end.iso} before start date ${start.iso}. The dates were stored as exported.`,
      amountImpact: null,
    });
  }
  if (annual.kind === "blank") {
    issues.push({
      code: IssueCode.blankAnnualValue,
      severity: "warning",
      description: `Contract ${contractId} has a blank annual value. It was stored as null, not zero.`,
      amountImpact: null,
    });
  }

  const autoRaw = record.auto_renew ?? "";
  let autoRenew: string | null = null;
  if (isBlank(autoRaw)) {
    issues.push({
      code: IssueCode.blankAutoRenew,
      severity: "warning",
      description: `Contract ${contractId} has a blank auto_renew value. It was stored as null.`,
      amountImpact: null,
    });
  } else {
    autoRenew = autoRaw;
    if (!AUTO_RENEW.has(autoRaw)) {
      issues.push(unexpectedValue("auto_renew", autoRaw, IssueCode.unexpectedAutoRenew));
    }
  }

  if (!BILLING_FREQUENCIES.has(billingFrequency)) {
    issues.push(unexpectedValue("billing_frequency", billingFrequency, IssueCode.unexpectedBillingFrequency));
  }
  if (!SERVICE_TIERS.has(serviceTier)) {
    issues.push(unexpectedValue("service_tier", serviceTier, IssueCode.unexpectedServiceTier));
  }

  const link = contractLink(customerRef, crmIds.has(customerRef));
  if (link.status === "unmatched") {
    issues.push({
      code: IssueCode.unknownCustomerRef,
      severity: "warning",
      description: link.reason,
      amountImpact: null,
    });
  }

  return {
    sourceContractId: contractId,
    customerRef,
    startDate: start.iso,
    endDate: end.iso,
    annualValue: annual.kind === "amount" ? annual.decimal : null,
    billingFrequency,
    autoRenew,
    serviceTier,
    link,
    issues,
  };
}
