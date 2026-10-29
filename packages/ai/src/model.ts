export type CompletionOptions = {
  json?: boolean;
};

export interface LanguageModel {
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
}

export function createUnavailableModel(): LanguageModel {
  return {
    async complete(): Promise<string> {
      throw new Error("No LLM provider is configured.");
    },
  };
}
