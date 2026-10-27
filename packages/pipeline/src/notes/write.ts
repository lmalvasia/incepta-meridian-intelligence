import type { Tx } from "../import/types.js";
import { createIssues } from "../import/issues.js";
import { customerIdFor } from "../customers/write.js";
import { utcDate } from "../utils/dates.js";
import { CHUNK, chunks } from "../utils/batch.js";
import type { NoteDraft } from "./types.js";

export async function writeNotes(
  tx: Tx,
  drafts: readonly NoteDraft[],
  customerIds: ReadonlyMap<string, string>,
): Promise<void> {
  if (drafts.length === 0) {
    return;
  }

  const sourceIds = drafts.map((draft) => draft.sourceNoteId);
  const existing = await tx.accountNote.findMany({
    where: { sourceNoteId: { in: sourceIds } },
    select: { id: true },
  });
  const existingIds = existing.map((row) => row.id);
  if (existingIds.length > 0) {
    await tx.dataQualityIssue.deleteMany({ where: { noteId: { in: existingIds } } });
    await tx.accountNote.deleteMany({ where: { id: { in: existingIds } } });
  }

  for (const chunk of chunks(drafts, CHUNK)) {
    await tx.accountNote.createMany({
      data: chunk.map((draft) => ({
        sourceNoteId: draft.sourceNoteId,
        customerName: draft.customerName,
        noteDate: utcDate(draft.noteDate),
        author: draft.author,
        noteText: draft.noteText,
        customerId: customerIdFor(draft.link, customerIds),
        linkStatus: draft.link.status,
        linkReason: draft.link.reason,
      })),
    });
  }

  const stored = await tx.accountNote.findMany({
    where: { sourceNoteId: { in: sourceIds } },
    select: { id: true, sourceNoteId: true },
  });
  const ids = new Map(stored.map((row) => [row.sourceNoteId, row.id]));
  await createIssues(
    tx,
    drafts.flatMap((draft) => {
      const noteId = ids.get(draft.sourceNoteId);
      if (noteId === undefined) {
        throw new Error(`Note ${draft.sourceNoteId} was not stored.`);
      }
      return draft.issues.map((issue) => ({ noteId, issue }));
    }),
  );
}
