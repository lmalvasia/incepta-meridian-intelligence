import { isModelCategory, phraseCategory } from "./phrases.js";
import type { ClassifiedNote, NoteCategoryName, NoteInput } from "./types.js";

export type CoverageReport = {
  source: "model" | "phrases";
  classified: number;
  total: number;
  agreement: { matched: number; known: number } | null;
  message: string;
};

export function noteCoverage(notes: readonly NoteInput[], modelNotes: readonly ClassifiedNote[] | null): CoverageReport {
  if (modelNotes === null) {
    return {
      source: "phrases",
      classified: 0,
      total: notes.length,
      agreement: null,
      message: "Note categories are not saved. No model has classified these notes.",
    };
  }

  const accepted = new Map<string, NoteCategoryName>();
  for (const note of modelNotes) {
    if (isModelCategory(note.category)) {
      accepted.set(note.noteId, note.category);
    }
  }

  let known = 0;
  let matched = 0;
  for (const note of notes) {
    const expected = phraseCategory(note.noteText);
    if (expected === "unlabeled") {
      continue;
    }
    known += 1;
    if (accepted.get(note.sourceNoteId) === expected) {
      matched += 1;
    }
  }

  return {
    source: "model",
    classified: notes.filter((note) => accepted.has(note.sourceNoteId)).length,
    total: notes.length,
    agreement: { matched, known },
    message: `Agrees with known phrases on ${matched.toString()} of ${known.toString()} notes.`,
  };
}
