import { describe, expect, it } from "vitest";
import { createNoteAnalyzer, createUnavailableModel } from "./index.js";

describe("note analyzer", () => {
  it("does not return financial metrics", async () => {
    const result = await createNoteAnalyzer().analyzeNotes(["Pump inspection delayed."]);

    expect(result).toEqual({
      status: "unavailable",
      reason: "No LLM provider is configured.",
    });
    expect(Object.keys(result).sort()).toEqual(["reason", "status"]);
    expect(result).not.toHaveProperty("revenue");
    expect(result).not.toHaveProperty("amount");
  });

  it("refuses to complete prompts without a provider", async () => {
    await expect(createUnavailableModel().complete("summarize")).rejects.toThrow(
      /No LLM provider is configured/,
    );
  });
});
