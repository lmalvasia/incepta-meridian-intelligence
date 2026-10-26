export interface LanguageModel {
  complete(prompt: string): Promise<string>;
}

export type NoteAnalysis = {
  status: "unavailable";
  reason: string;
};

export interface NoteAnalyzer {
  analyzeNotes(notes: readonly string[]): Promise<NoteAnalysis>;
}

export function createUnavailableModel(): LanguageModel {
  return {
    async complete(): Promise<string> {
      throw new Error("No LLM provider is configured.");
    },
  };
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
