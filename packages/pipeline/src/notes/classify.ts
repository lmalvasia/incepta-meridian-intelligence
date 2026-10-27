import { linkCustomerName } from "../customers/matching.js";
import type { CrmParty } from "../customers/types.js";
import type { FilePlan, SkippedRow, SourceText } from "../import/types.js";
import { parseDate } from "../utils/dates.js";
import { invalidRow, IssueCode, missingFields, repeatedHeaderIssue, type IssueDraft } from "../utils/issues.js";
import { collapsedAmounts, finishFile, parseSource, rowRecord } from "../utils/plan.js";
import { collapseRows, conflictIssue, conflictSkips, isBlank, isRepeatedHeader } from "../utils/rows.js";
import type { NoteDraft } from "./types.js";

export function classifyNotes(input: SourceText, parties: readonly CrmParty[]): FilePlan {
  const table = parseSource(input, "account_notes.csv");
  const groups = collapseRows(table.rows, table.headers, (row) => {
    if (row.cells.length !== table.headers.length) {
      return null;
    }
    if (isRepeatedHeader(table.headers, row.cells)) {
      return "note_id";
    }
    const noteId = rowRecord(table.headers, row).note_id ?? "";
    return isBlank(noteId) ? null : noteId;
  });

  const skipped: SkippedRow[] = [];
  const notes: NoteDraft[] = [];
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
      issues.push(repeatedHeaderIssue("a note"));
    }
    const conflict = conflictIssue(group);
    if (conflict !== null) {
      issues.push(conflict);
    }
    skipped.push(...conflictSkips(group));

    const draft = !columnMismatch && !repeated ? noteFrom(record, issues) : undefined;
    if (draft === undefined) {
      rejectedFirst.add(group.key);
      skipped.push({ key: group.key, issues });
      continue;
    }
    notes.push(draft);
  }

  linkNoteNames(notes, parties);
  return finishFile(input, table.rows.length, groups, rejectedFirst, skipped, collapsedAmounts(groups, () => undefined), {
    notes,
  });
}

function noteFrom(record: Record<string, string>, issues: IssueDraft[]): NoteDraft | undefined {
  const missing: string[] = [];
  const noteId = record.note_id ?? "";
  const customerName = record.customer_name ?? "";
  const author = record.author ?? "";
  const noteText = record.note_text ?? "";
  if (isBlank(noteId)) {
    missing.push("note_id");
  }
  if (isBlank(customerName)) {
    missing.push("customer_name");
  }
  if (isBlank(author)) {
    missing.push("author");
  }
  if (isBlank(noteText)) {
    missing.push("note_text");
  }

  const parsedDate = parseDate(record.note_date ?? "");
  if (parsedDate.kind === "blank") {
    missing.push("note_date");
  }
  if (missing.length > 0) {
    issues.push(missingFields(missing));
  }
  if (parsedDate.kind === "invalid") {
    issues.push({
      code: IssueCode.invalidDate,
      severity: "error",
      description: `${parsedDate.reason} The row was not stored as a note.`,
      amountImpact: null,
    });
  }
  if (parsedDate.kind !== "date" || missing.length > 0) {
    return undefined;
  }

  return {
    sourceNoteId: noteId,
    customerName,
    noteDate: parsedDate.iso,
    author,
    noteText,
    link: { status: "unmatched", customerSourceId: null, reason: "" },
    issues,
  };
}

function linkNoteNames(notes: NoteDraft[], parties: readonly CrmParty[]): void {
  const byName = new Map<string, NoteDraft[]>();
  for (const note of notes) {
    const list = byName.get(note.customerName) ?? [];
    list.push(note);
    byName.set(note.customerName, list);
  }

  for (const [name, rows] of byName) {
    const decision = linkCustomerName(
      name,
      rows.map((row) => ({ issues: row.issues, sortKey: row.sourceNoteId })),
      parties,
    );
    for (const row of rows) {
      row.link = decision;
    }
  }
}
