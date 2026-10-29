import { describe, expect, it } from "vitest";
import type { RevenueAnalysis } from "@meridian/ai";
import type { AnalysisRecordStore, StoredAnalysis } from "./analysis-records.js";
import { resolveAnalysis } from "./resolve-analysis.js";

function memoryStore(): AnalysisRecordStore & { rows: Map<string, StoredAnalysis> } {
  const rows = new Map<string, StoredAnalysis>();
  return {
    rows,
    async read(_model: string, factsHash: string): Promise<StoredAnalysis | null> {
      return rows.get(factsHash) ?? null;
    },
    async save(_model: string, factsHash: string, analysis: StoredAnalysis): Promise<void> {
      rows.set(factsHash, analysis);
    },
  };
}

describe("stored revenue analysis", () => {
  it("calls the model once for the same figures and skips a rejected result", async () => {
    const store = memoryStore();
    let calls = 0;
    const analyze = async (): Promise<RevenueAnalysis> => {
      calls += 1;
      return { status: "ready", focus: "revenue", text: "H1 2026 billed is $105.00." };
    };
    const facts = { text: "H1 2026 billed 105.00", allowedAmounts: ["105.00"] };
    const first = await resolveAnalysis(store, "gpt-5.5", facts, analyze);
    const second = await resolveAnalysis(store, "gpt-5.5", facts, analyze);
    expect(first).toEqual(second);
    expect(calls).toBe(1);

    calls = 0;
    const rejected = await resolveAnalysis(store, "gpt-5.5", { text: "other", allowedAmounts: [] }, async () => {
      calls += 1;
      return { status: "rejected", text: "The gap is $999,999." };
    });
    expect(rejected.status).toBe("rejected");
    expect(calls).toBe(1);
    const again = await resolveAnalysis(store, "gpt-5.5", { text: "other", allowedAmounts: [] }, async () => {
      calls += 1;
      return { status: "ready", focus: "notes", text: "Notes next." };
    });
    expect(again).toMatchObject({ status: "ready", text: "Notes next." });
    expect(calls).toBe(2);
  });
});
