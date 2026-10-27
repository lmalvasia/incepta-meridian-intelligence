import { createHash } from "node:crypto";
import { recordFrom, type ParsedRow } from "./csv.js";
import { IssueCode, type IssueDraft } from "./issues.js";

export function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === "";
}

export function payloadFor(headers: readonly string[], cells: readonly string[]): Record<string, string> {
  const payload = recordFrom(headers, cells);
  if (cells.length > headers.length) {
    payload.__extra = cells.slice(headers.length).join(" | ");
  }
  return payload;
}

export function contentHash(payload: Record<string, string>): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export type CollapsedConflict = {
  row: ParsedRow;
  payload: Record<string, string>;
  hash: string;
};

export type CollapsedGroup = {
  key: string;
  row: ParsedRow;
  payload: Record<string, string>;
  hash: string;
  extraCopies: Array<{ lineNumber: number; payload: Record<string, string> }>;
  conflicts: CollapsedConflict[];
};

export function collapseRows(
  rows: readonly ParsedRow[],
  headers: readonly string[],
  keyOf: (row: ParsedRow) => string | null,
): CollapsedGroup[] {
  const groups = new Map<string, CollapsedGroup>();
  const order: string[] = [];

  for (const row of rows) {
    const payload = payloadFor(headers, row.cells);
    const hash = contentHash(payload);
    const businessKey = keyOf(row);
    if (businessKey === null) {
      const key = `row:${row.lineNumber.toString()}`;
      order.push(key);
      groups.set(key, { key, row, payload, hash, extraCopies: [], conflicts: [] });
      continue;
    }

    const existing = groups.get(businessKey);
    if (existing === undefined) {
      order.push(businessKey);
      groups.set(businessKey, {
        key: businessKey,
        row,
        payload,
        hash,
        extraCopies: [],
        conflicts: [],
      });
      continue;
    }

    if (existing.hash === hash) {
      existing.extraCopies.push({ lineNumber: row.lineNumber, payload });
      continue;
    }

    existing.conflicts.push({ row, payload, hash });
  }

  return order.map((key) => {
    const group = groups.get(key);
    if (group === undefined) {
      throw new Error(`Missing collapsed group ${key}.`);
    }
    return group;
  });
}

export function conflictIssue(group: CollapsedGroup): IssueDraft | null {
  if (group.conflicts.length === 0) {
    return null;
  }
  const lines = group.conflicts
    .map(
      (conflict) =>
        `Line ${conflict.row.lineNumber.toString()} repeats ${group.key} with different cells. That copy was not applied.`,
    )
    .join(" ");
  return {
    code: IssueCode.conflictingSourceRow,
    severity: "error",
    description: lines,
    amountImpact: null,
  };
}

export function conflictSkips(group: CollapsedGroup): Array<{ key: string; issues: IssueDraft[] }> {
  return group.conflicts.map((conflict) => ({
    key: `${group.key}#line${conflict.row.lineNumber.toString()}`,
    issues: [
      {
        code: IssueCode.conflictingSourceRow,
        severity: "error",
        description: `Line ${conflict.row.lineNumber.toString()} repeats ${group.key} with different cells than line ${group.row.lineNumber.toString()}. The first row was kept.`,
        amountImpact: null,
      },
    ],
  }));
}

export function countRejected(groups: readonly CollapsedGroup[], rejectedFirst: ReadonlySet<string>): number {
  let rejected = 0;
  for (const group of groups) {
    rejected += group.extraCopies.length + group.conflicts.length;
    if (rejectedFirst.has(group.key)) {
      rejected += 1;
    }
  }
  return rejected;
}

export function isRepeatedHeader(headers: readonly string[], cells: readonly string[]): boolean {
  return cells.length === headers.length && cells.every((cell, index) => cell === headers[index]);
}
