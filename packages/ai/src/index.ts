export type { LanguageModel } from "./model.js";
export { createUnavailableModel } from "./model.js";

export type NoteAnalysis = {
  status: "unavailable";
  reason: string;
};

export interface NoteAnalyzer {
  analyzeNotes(notes: readonly string[]): Promise<NoteAnalysis>;
}

export function createNoteAnalyzer(): NoteAnalyzer {
  return {
    async analyzeNotes(): Promise<NoteAnalysis> {
      return {
        status: "unavailable",
        reason: "No LLM provider is configured.",
      };
    },
  };
}

export { checkAmounts } from "./amounts.js";
export { createChatModel } from "./chat.js";
export type { ChatModelOptions } from "./chat.js";
export { classifyNoteBatches, classifyNotes, createUnavailableClassifier, noteCategories } from "./notes.js";
export type { ClassifiedModelNote, ModelNoteCategory, NoteClassification, NoteToClassify } from "./notes.js";
export { readFocus } from "./focus.js";
export type { AnalysisFocus } from "./focus.js";
export { analyzeRevenue, createUnavailableRevenueAnalyst } from "./revenue-analysis.js";
export type { RevenueAnalysis, RevenueFacts } from "./revenue-analysis.js";
