import type { ClassifiedModelNote, NoteClassification, NoteToClassify } from "@meridian/ai";
import { contentHash } from "./content-hash.js";
import type { NoteRecordStore, StoredNote } from "./note-records.js";

const batchSize = 40;

export async function resolveNotes(
  store: NoteRecordStore,
  model: string,
  notes: readonly NoteToClassify[],
  classify: (pending: readonly NoteToClassify[]) => Promise<NoteClassification>,
): Promise<{ notes: ClassifiedModelNote[] | null; failure: string | null }> {
  const stored = new Map((await store.read(model)).map((row) => [row.sourceNoteId, row]));
  const ready: ClassifiedModelNote[] = [];
  const pending: NoteToClassify[] = [];
  for (const note of notes) {
    const row = stored.get(note.noteId);
    if (row !== undefined && row.textHash === contentHash(note.text)) {
      ready.push({ noteId: note.noteId, category: row.category, line: row.line });
    } else {
      pending.push(note);
    }
  }
  if (pending.length === 0) {
    return { notes: ready, failure: null };
  }
  const collected = [...ready];
  let failure: string | null = null;
  for (let index = 0; index < pending.length; index += batchSize) {
    const slice = pending.slice(index, index + batchSize);
    const classification = await classify(slice);
    if (classification.status !== "ready") {
      failure = classification.reason;
      break;
    }
    const fresh = classification.notes.flatMap((note) => freshRow(slice, note));
    await store.save(model, fresh);
    collected.push(...fresh.map(asClassified));
  }
  return { notes: collected.length > 0 ? collected : null, failure };
}

function freshRow(pending: readonly NoteToClassify[], note: ClassifiedModelNote): StoredNote[] {
  const source = pending.find((item) => item.noteId === note.noteId);
  if (source === undefined) {
    return [];
  }
  return [{ sourceNoteId: note.noteId, textHash: contentHash(source.text), category: note.category, line: note.line }];
}

function asClassified(note: StoredNote): ClassifiedModelNote {
  return { noteId: note.sourceNoteId, category: note.category, line: note.line };
}
