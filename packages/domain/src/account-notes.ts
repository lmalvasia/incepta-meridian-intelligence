import { higherCategory, isModelCategory } from "./phrases.js";
import type { ClassifiedNote, NoteCategoryName, NoteInput } from "./types.js";

export type AccountNote = {
  sourceNoteId: string;
  noteDate: string;
  noteText: string;
  category: Exclude<NoteCategoryName, "no_notes">;
  chosen: boolean;
};

type RankedNote = Omit<AccountNote, "chosen"> & { fromModel: boolean };

export function notesForAccount(
  notes: readonly NoteInput[],
  modelNotes: readonly ClassifiedNote[] | null,
  sourceId: string,
): AccountNote[] {
  const model = new Map((modelNotes ?? []).map((note) => [note.noteId, note]));
  const ranked = notes.flatMap((note) => rank(note, model, sourceId));
  ranked.sort(byRank);
  const chosen = ranked[0]?.sourceNoteId;
  return ranked.map((note) => ({
    sourceNoteId: note.sourceNoteId,
    noteDate: note.noteDate,
    noteText: note.noteText,
    category: note.category,
    chosen: note.sourceNoteId === chosen,
  }));
}

function rank(note: NoteInput, model: ReadonlyMap<string, ClassifiedNote>, sourceId: string): RankedNote[] {
  if (note.linkStatus !== "linked" || note.customerSourceId !== sourceId) {
    return [];
  }
  const saved = model.get(note.sourceNoteId);
  const fromModel = saved !== undefined && isModelCategory(saved.category);
  const category = fromModel && saved !== undefined ? saved.category : "unlabeled";
  if (category === "no_notes") {
    return [];
  }
  return [
    {
      sourceNoteId: note.sourceNoteId,
      noteDate: note.noteDate,
      noteText: note.noteText,
      category,
      fromModel,
    },
  ];
}

function byRank(left: RankedNote, right: RankedNote): number {
  if (left.fromModel !== right.fromModel) {
    return left.fromModel ? -1 : 1;
  }
  if (left.category !== right.category) {
    return higherCategory(left.category, right.category) === left.category ? -1 : 1;
  }
  return left.sourceNoteId.localeCompare(right.sourceNoteId);
}
