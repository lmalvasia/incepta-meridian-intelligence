import { describe, expect, it } from "vitest";
import { checkAmounts } from "./amounts.js";
import type { LanguageModel } from "./model.js";
import { classifyNotes } from "./notes.js";
import { analyzeRevenue } from "./revenue-analysis.js";

function model(text: string): LanguageModel {
  return {
    async complete(): Promise<string> {
      return text;
    },
  };
}

describe("note classification and revenue analysis", () => {
  it("keeps a competitor label and drops a category outside the list", async () => {
    const result = await classifyNotes(
      model(
        JSON.stringify([
          { noteId: "N-1", category: "competitor", line: "Moving to Therma-Serv at contract end." },
          { noteId: "N-2", category: "urgent", line: "Nope." },
        ]),
      ),
      [{ noteId: "N-1", text: "Moving to Therma-Serv." }],
    );
    expect(result).toEqual({
      status: "ready",
      notes: [{ noteId: "N-1", category: "competitor", line: "Moving to Therma-Serv at contract end." }],
    });
  });

  it("shows a paragraph that repeats a supplied amount and rejects an invented one", async () => {
    const allowed = ["105.00"];
    const ready = await analyzeRevenue(
      {
        async complete(text: string): Promise<string> {
          expect(text).toContain("what may be happening");
          return "H1 2026 billed is $105.00.";
        },
      },
      { text: "H1 2026 billed 105.00", allowedAmounts: allowed },
    );
    expect(ready).toMatchObject({ status: "ready", focus: "revenue", text: "H1 2026 billed is $105.00." });
    const notes = await analyzeRevenue(model("FOCUS: notes\nThe notes are not classified yet."), {
      text: "H1 2026 billed 105.00",
      allowedAmounts: allowed,
    });
    expect(notes).toMatchObject({ status: "ready", focus: "notes", text: "The notes are not classified yet." });
    const rejected = await analyzeRevenue(model("The gap is $999,999."), {
      text: "H1 2026 billed 105.00",
      allowedAmounts: allowed,
    });
    expect(rejected.status).toBe("rejected");
    expect(checkAmounts("No dollar figure here.", allowed)).toBe("ready");
  });
});