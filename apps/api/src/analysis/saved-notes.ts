import type { ClassifiedNote } from "@meridian/domain";
import { contentHash } from "./content-hash.js";
import type { NoteRecordStore } from "./note-records.js";

export async function savedModelNotes(
  store: NoteRecordStore,
  model: string,
  notes: readonly { noteId: string; text: string }[],
): Promise<ClassifiedNote[] | null> {
  const stored = await store.read(model);
  if (stored.length === 0) {
    return null;
  }
  const byId = new Map(stored.map((row) => [row.sourceNoteId, row]));
  const ready: ClassifiedNote[] = [];
  for (const note of notes) {
    const row = byId.get(note.noteId);
    if (row !== undefined && row.textHash === contentHash(note.text)) {
      ready.push({ noteId: note.noteId, category: row.category, line: row.line });
    }
  }
  return ready.length > 0 ? ready : null;
}
