import { checkAmounts } from "./amounts.js";
import { readFocus, type AnalysisFocus } from "./focus.js";
import type { LanguageModel } from "./model.js";

export type RevenueFacts = {
  text: string;
  allowedAmounts: readonly string[];
};

export type RevenueAnalysis =
  | { status: "unavailable"; reason: string }
  | { status: "ready"; text: string; focus: AnalysisFocus }
  | { status: "rejected"; text: string };

export function createUnavailableRevenueAnalyst(): {
  analyze(facts: RevenueFacts): Promise<RevenueAnalysis>;
} {
  return {
    async analyze(): Promise<RevenueAnalysis> {
      return { status: "unavailable", reason: "No LLM provider is configured." };
    },
  };
}

export async function analyzeRevenue(model: LanguageModel, facts: RevenueFacts): Promise<RevenueAnalysis> {
  const text = await model.complete(
    [
      "Advise a CFO in English.",
      "Write three short suggestions about what may be happening and what to check.",
      "Use only the facts below. Do not invent a cause or a figure.",
      "A contract end date is not proof the customer left.",
      "Start with exactly one line: FOCUS: revenue or FOCUS: notes.",
      "Use FOCUS: revenue when the suggestions are about the billed figures.",
      "Use FOCUS: notes when the suggestions are about the note tags.",
      "If you mention money, copy a figure from the facts.",
      facts.text,
    ].join("\n"),
  );
  if (checkAmounts(text, facts.allowedAmounts) === "rejected") {
    return { status: "rejected", text };
  }
  const focused = readFocus(text);
  return { status: "ready", text: focused.text, focus: focused.focus };
}
