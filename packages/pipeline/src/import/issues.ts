import type { IssueDraft } from "../utils/issues.js";
import { CHUNK, chunks } from "../utils/batch.js";
import type { Tx } from "./types.js";

export type IssueParent = {
  customerId?: string;
  invoiceId?: string;
  contractId?: string;
  noteId?: string;
  issue: IssueDraft;
};

export async function createIssues(tx: Tx, rows: readonly IssueParent[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  for (const chunk of chunks(rows, CHUNK)) {
    await tx.dataQualityIssue.createMany({
      data: chunk.map((row) => ({
        code: row.issue.code,
        severity: row.issue.severity,
        description: row.issue.description,
        amountImpact: row.issue.amountImpact,
        customerId: row.customerId ?? null,
        invoiceId: row.invoiceId ?? null,
        contractId: row.contractId ?? null,
        noteId: row.noteId ?? null,
      })),
    });
  }
}
