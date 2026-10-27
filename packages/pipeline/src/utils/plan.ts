import type { FilePlan, SkippedRow, SourceText } from "../import/types.js";
import { parseCsv, recordFrom, type ParsedRow, type ParsedTable } from "./csv.js";
import { assertHeaders, type SourceFileName } from "./headers.js";
import { type IssueDraft, type SeverityName } from "./issues.js";
import { parseMoney } from "./money.js";
import { countRejected, type CollapsedGroup } from "./rows.js";

export function parseSource(input: SourceText, fileName: SourceFileName): ParsedTable {
  let table: ParsedTable;
  try {
    table = parseCsv(input.text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${input.fileName}: ${message}`);
  }
  assertHeaders(fileName, table.headers);
  return table;
}

export function rowRecord(headers: readonly string[], row: ParsedRow): Record<string, string> {
  return recordFrom(headers, row.cells);
}

export function collapsedAmounts(
  groups: readonly CollapsedGroup[],
  amountOf: (payload: Record<string, string>) => string | undefined,
): { copies: number; cents: bigint; incomplete: boolean } {
  let cents = 0n;
  let incomplete = false;
  let copies = 0;
  for (const group of groups) {
    copies += group.extraCopies.length;
    for (const copy of group.extraCopies) {
      const raw = amountOf(copy.payload);
      if (raw === undefined) {
        continue;
      }
      const money = parseMoney(raw);
      if (money.kind === "amount") {
        cents += money.cents;
      } else if (money.kind === "invalid") {
        incomplete = true;
      }
    }
  }
  return { copies, cents, incomplete };
}

function severityRank(severity: SeverityName): number {
  if (severity === "error") {
    return 2;
  }
  if (severity === "warning") {
    return 1;
  }
  return 0;
}

function dedupeIssues(issues: readonly IssueDraft[]): IssueDraft[] {
  const merged: IssueDraft[] = [];
  for (const issue of issues) {
    const existing = merged.find((item) => item.code === issue.code);
    if (existing === undefined) {
      merged.push({ ...issue });
      continue;
    }
    if (!existing.description.includes(issue.description)) {
      existing.description = `${existing.description} ${issue.description}`;
    }
    if (severityRank(issue.severity) > severityRank(existing.severity)) {
      existing.severity = issue.severity;
    }
    if (existing.amountImpact === null) {
      existing.amountImpact = issue.amountImpact;
    }
  }
  return merged;
}

export function finishFile(
  input: SourceText,
  rowCount: number,
  groups: readonly CollapsedGroup[],
  rejectedFirst: ReadonlySet<string>,
  skipped: SkippedRow[],
  collapsed: { copies: number; cents: bigint; incomplete: boolean },
  entities: {
    customers?: FilePlan["customers"];
    invoices?: FilePlan["invoices"];
    contracts?: FilePlan["contracts"];
    notes?: FilePlan["notes"];
  },
): FilePlan {
  const customers = entities.customers ?? [];
  const invoices = entities.invoices ?? [];
  const contracts = entities.contracts ?? [];
  const notes = entities.notes ?? [];
  for (const row of [...customers, ...invoices, ...contracts, ...notes]) {
    row.issues = dedupeIssues(row.issues);
  }
  for (const row of skipped) {
    row.issues = dedupeIssues(row.issues);
  }

  const flaggedCount = [...customers, ...invoices, ...contracts, ...notes].filter((row) => row.issues.length > 0).length;

  return {
    fileName: input.fileName,
    sourceSystem: input.sourceSystem,
    byteSize: input.byteSize,
    readCount: rowCount,
    skippedCount: countRejected(groups, rejectedFirst),
    flaggedCount,
    collapsedCopies: collapsed.copies,
    collapsedCents: collapsed.cents,
    collapsedAmountsIncomplete: collapsed.incomplete,
    customers,
    invoices,
    contracts,
    notes,
    skipped,
  };
}
