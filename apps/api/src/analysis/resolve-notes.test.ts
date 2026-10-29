import { describe, expect, it } from "vitest";
import type { NoteClassification, NoteToClassify } from "@meridian/ai";
import type { NoteRecordStore, StoredNote } from "./note-records.js";
import { resolveNotes } from "./resolve-notes.js";
import { contentHash } from "./content-hash.js";

function memoryStore(rows: StoredNote[] = []): NoteRecordStore & { saved: StoredNote[] } {
  const saved = [...rows];
  return {
    saved,
    async read(): Promise<StoredNote[]> {
      return saved;
    },
    async save(_model: string, notes: readonly StoredNote[]): Promise<void> {
      for (const note of notes) {
        const index = saved.findIndex((row) => row.sourceNoteId === note.sourceNoteId);
        if (index >= 0) {
          saved[index] = note;
        } else {
          saved.push(note);
        }
      }
    },
  };
}

describe("stored note classifications", () => {
  it("reuses a saved note and does not call the model", async () => {
    let calls = 0;
    const store = memoryStore([
      { sourceNoteId: "N-1", textHash: contentHash("Moving to Therma-Serv."), category: "competitor", line: "Moving to Therma-Serv." },
    ]);
    const result = await resolveNotes(store, "gpt-5.5", [{ noteId: "N-1", text: "Moving to Therma-Serv." }], async () => {
      calls += 1;
      return { status: "ready", notes: [] };
    });
    expect(calls).toBe(0);
    expect(result).toEqual({
      notes: [{ noteId: "N-1", category: "competitor", line: "Moving to Therma-Serv." }],
      failure: null,
    });
  });

  it("classifies only a note whose text changed", async () => {
    const seen: NoteToClassify[][] = [];
    const store = memoryStore([
      { sourceNoteId: "N-1", textHash: contentHash("Old text."), category: "routine", line: "Old." },
    ]);
    const result = await resolveNotes(store, "gpt-5.5", [{ noteId: "N-1", text: "Moving to Therma-Serv." }], async (pending) => {
      seen.push([...pending]);
      const ready: NoteClassification = {
        status: "ready",
        notes: [{ noteId: "N-1", category: "competitor", line: "Moving to Therma-Serv." }],
      };
      return ready;
    });
    expect(seen).toEqual([[{ noteId: "N-1", text: "Moving to Therma-Serv." }]]);
    expect(result.notes).toEqual([{ noteId: "N-1", category: "competitor", line: "Moving to Therma-Serv." }]);
    expect(store.saved[0]?.textHash).toBe(contentHash("Moving to Therma-Serv."));
  });

  it("keeps saved tags when the model call fails", async () => {
    const store = memoryStore([
      { sourceNoteId: "N-1", textHash: contentHash("Fine."), category: "positive", line: "Fine." },
    ]);
    const result = await resolveNotes(
      store,
      "gpt-5.5",
      [
        { noteId: "N-1", text: "Fine." },
        { noteId: "N-2", text: "New note." },
      ],
      async () => ({ status: "unavailable", reason: "The model has no credits remaining." }),
    );
    expect(result.failure).toBe("The model has no credits remaining.");
    expect(result.notes).toEqual([{ noteId: "N-1", category: "positive", line: "Fine." }]);
    expect(store.saved).toHaveLength(1);
  });

  it("keeps a saved batch when a later batch is rate limited", async () => {
    const notes = Array.from({ length: 41 }, (_, index) => ({
      noteId: `N-${index.toString()}`,
      text: `Note ${index.toString()}`,
    }));
    const store = memoryStore();
    let calls = 0;
    const result = await resolveNotes(store, "gpt-5.5", notes, async (pending) => {
      calls += 1;
      if (calls === 2) {
        return { status: "unavailable", reason: "The model is rate limited." };
      }
      return {
        status: "ready",
        notes: pending.map((note) => ({ noteId: note.noteId, category: "routine" as const, line: note.text })),
      };
    });
    expect(calls).toBe(2);
    expect(store.saved).toHaveLength(40);
    expect(result.failure).toBe("The model is rate limited.");
    expect(result.notes).toHaveLength(40);
  });
});
