import { describe, expect, it } from "vitest";
import { notesForAccount } from "./account-notes.js";
import type { NoteInput } from "./types.js";

function note(overrides: Partial<NoteInput>): NoteInput {
  return {
    sourceNoteId: "N-1",
    noteDate: "2026-01-01",
    noteText: "Check-in.",
    linkStatus: "linked",
    customerSourceId: "C-0105",
    ...overrides,
  };
}

describe("notes for one account", () => {
  it("keeps every linked note and marks the stronger model category", () => {
    const rows = notesForAccount(
      [
        note({ sourceNoteId: "N-2", noteDate: "2026-03-01", noteText: "Uptime targets met." }),
        note({ sourceNoteId: "N-9", noteDate: "2025-01-01", noteText: "Moving to Therma-Serv." }),
        note({ sourceNoteId: "N-3", linkStatus: "held", customerSourceId: null, noteText: "Held." }),
        note({ sourceNoteId: "N-4", customerSourceId: "C-0800", noteText: "Other account." }),
      ],
      [
        { noteId: "N-2", category: "positive", line: "Going well." },
        { noteId: "N-9", category: "competitor", line: "Leaving." },
      ],
      "C-0105",
    );
    expect(rows.map((row) => [row.sourceNoteId, row.category, row.chosen])).toEqual([
      ["N-9", "competitor", true],
      ["N-2", "positive", false],
    ]);
  });

  it("uses the lower note id when the category is the same", () => {
    const rows = notesForAccount(
      [
        note({ sourceNoteId: "N-8", noteText: "Second routine." }),
        note({ sourceNoteId: "N-2", noteText: "First routine." }),
      ],
      [
        { noteId: "N-8", category: "routine", line: "Later." },
        { noteId: "N-2", category: "routine", line: "Earlier." },
      ],
      "C-0105",
    );
    expect(rows.map((row) => [row.sourceNoteId, row.chosen])).toEqual([
      ["N-2", true],
      ["N-8", false],
    ]);
  });
});
