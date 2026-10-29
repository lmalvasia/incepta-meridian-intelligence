import { describe, expect, it } from "vitest";
import { contentHash } from "./content-hash.js";
import type { NoteRecordStore, StoredNote } from "./note-records.js";
import { savedModelNotes } from "./saved-notes.js";

function store(rows: StoredNote[]): NoteRecordStore {
  return {
    async read(): Promise<StoredNote[]> {
      return rows;
    },
    async save(): Promise<void> {
      return undefined;
    },
  };
}

describe("saved model notes", () => {
  it("returns null when nothing is saved", async () => {
    const notes = await savedModelNotes(store([]), "gpt-5.5", [{ noteId: "N-1", text: "Hello" }]);
    expect(notes).toBeNull();
  });

  it("keeps a saved category when the text matches and drops a changed note", async () => {
    const notes = await savedModelNotes(
      store([
        { sourceNoteId: "N-1", textHash: contentHash("Moving to Therma-Serv."), category: "competitor", line: "Leaving." },
        { sourceNoteId: "N-2", textHash: contentHash("old"), category: "routine", line: "Old." },
      ]),
      "gpt-5.5",
      [
        { noteId: "N-1", text: "Moving to Therma-Serv." },
        { noteId: "N-2", text: "new" },
      ],
    );
    expect(notes).toEqual([{ noteId: "N-1", category: "competitor", line: "Leaving." }]);
  });
});
