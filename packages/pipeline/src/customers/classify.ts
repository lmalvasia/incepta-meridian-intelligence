import type { FilePlan, SkippedRow, SourceText } from "../import/types.js";
import { parseDate } from "../utils/dates.js";
import { invalidRow, IssueCode, missingFields, repeatedHeaderIssue, unexpectedValue, type IssueDraft } from "../utils/issues.js";
import { normalizeName } from "../utils/names.js";
import { collapsedAmounts, finishFile, parseSource, rowRecord } from "../utils/plan.js";
import { collapseRows, conflictIssue, conflictSkips, isBlank, isRepeatedHeader } from "../utils/rows.js";
import { crmTwinIssues } from "./matching.js";
import type { CrmParty, CustomerDraft } from "./types.js";

function present(value: string | undefined): string | null {
  if (value === undefined || value.trim() === "") {
    return null;
  }
  return value;
}

const CRM_STATUSES = new Set(["Active", "Inactive", "inactive", "Churned"]);
const CUSTOMER_ID = /^C-\d{4}$/;

function applyTwinIssues(parties: readonly CrmParty[], customers: CustomerDraft[]): void {
  const twins = crmTwinIssues(parties);
  for (const [sourceId, description] of twins) {
    const customer = customers.find((item) => item.sourceId === sourceId);
    if (customer === undefined) {
      continue;
    }
    customer.issues.push({
      code: IssueCode.possibleDuplicateCustomer,
      severity: "warning",
      description,
      amountImpact: null,
    });
  }
}

export function classifyCustomers(input: SourceText): { file: FilePlan; parties: CrmParty[] } {
  const table = parseSource(input, "crm_customers.csv");
  const groups = collapseRows(table.rows, table.headers, (row) => {
    if (row.cells.length !== table.headers.length) {
      return null;
    }
    const record = rowRecord(table.headers, row);
    if (isRepeatedHeader(table.headers, row.cells)) {
      return "customer_id";
    }
    const customerId = record.customer_id ?? "";
    return isBlank(customerId) ? null : customerId;
  });

  const skipped: SkippedRow[] = [];
  const parties: CrmParty[] = [];
  const rejectedFirst = new Set<string>();
  const customers: CustomerDraft[] = [];

  for (const group of groups) {
    const record = rowRecord(table.headers, group.row);
    const issues: IssueDraft[] = [];
    const columnMismatch = group.row.cells.length !== table.headers.length;
    const repeated = !columnMismatch && isRepeatedHeader(table.headers, group.row.cells);
    if (columnMismatch) {
      issues.push(invalidRow(group.row.cells.length, table.headers.length));
    }
    if (repeated) {
      issues.push(repeatedHeaderIssue("a customer"));
    }
    const conflict = conflictIssue(group);
    if (conflict !== null) {
      issues.push(conflict);
    }
    skipped.push(...conflictSkips(group));

    const customerId = record.customer_id ?? "";
    const companyName = record.company_name ?? "";
    let kept = !columnMismatch && !repeated;

    if (kept && isBlank(customerId)) {
      issues.push(missingFields(["customer_id"]));
      kept = false;
    } else if (kept && !CUSTOMER_ID.test(customerId)) {
      issues.push({
        code: IssueCode.invalidCustomerId,
        severity: "error",
        description: `customer_id "${customerId}" does not match C- and four digits. No customer was created.`,
        amountImpact: null,
      });
      kept = false;
    }

    if (kept && isBlank(companyName)) {
      issues.push(missingFields(["company_name"]));
      kept = false;
    }

    let createdOn: string | null = null;
    if (kept) {
      const created = parseDate(record.created_date ?? "");
      if (created.kind === "blank") {
        issues.push(missingFields(["created_date"]));
      } else if (created.kind === "invalid") {
        issues.push({
          code: IssueCode.invalidDate,
          severity: "error",
          description: `${created.reason} createdOn was left null.`,
          amountImpact: null,
        });
      } else {
        createdOn = created.iso;
        if (created.ambiguous) {
          issues.push({
            code: IssueCode.ambiguousCreatedDate,
            severity: "warning",
            description: `created_date "${record.created_date ?? ""}" can be read as month/day or day/month. Stored as ${created.iso} (month/day).`,
            amountImpact: null,
          });
        }
      }

      const status = record.status ?? "";
      if (isBlank(status)) {
        issues.push(missingFields(["status"]));
      } else if (!CRM_STATUSES.has(status)) {
        issues.push(unexpectedValue("status", status, IssueCode.unexpectedStatus));
      }

      if (isBlank(record.account_manager)) {
        issues.push({
          code: IssueCode.blankAccountManager,
          severity: "warning",
          description: "account_manager is blank.",
          amountImpact: null,
        });
      }
    }

    if (!kept) {
      rejectedFirst.add(group.key);
      skipped.push({ key: group.key, issues });
      continue;
    }

    customers.push({
      sourceId: customerId,
      displayName: companyName,
      industry: present(record.industry),
      city: present(record.city),
      state: present(record.state),
      accountManager: present(record.account_manager),
      accountStatus: present(record.status),
      createdOn,
      issues,
    });
    parties.push({
      sourceId: customerId,
      displayName: companyName,
      normalized: normalizeName(companyName),
    });
  }

  applyTwinIssues(parties, customers);

  return {
    parties,
    file: finishFile(
      input,
      table.rows.length,
      groups,
      rejectedFirst,
      skipped,
      collapsedAmounts(groups, () => undefined),
      { customers },
    ),
  };
}
