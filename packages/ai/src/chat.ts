import type { CompletionOptions, LanguageModel } from "./model.js";

export type ChatModelOptions = {
  apiKey: string;
  baseUrl: string;
  model: string;
  fetchImpl?: typeof fetch;
};

export function createChatModel(options: ChatModelOptions): LanguageModel {
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = `${options.baseUrl.replace(/\/$/, "")}/chat/completions`;
  return {
    async complete(prompt: string, completion?: CompletionOptions): Promise<string> {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const response = await fetchImpl(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody(options.model, prompt, completion?.json === true)),
        });
        if (response.ok) {
          const text = readContent(await response.json());
          if (text === null) {
            throw new Error("Model response had no text.");
          }
          return text;
        }
        const reason = await failureReason(response);
        if (reason !== "The model is rate limited." || attempt === 4) {
          throw new Error(reason);
        }
        await sleep(retryDelay(response, attempt));
      }
      throw new Error("The model is rate limited.");
    },
  };
}

function retryDelay(response: Response, attempt: number): number {
  const header = Number(response.headers.get("retry-after"));
  if (Number.isFinite(header) && header >= 0) {
    return Math.min(header * 1000, 20_000);
  }
  return Math.min(1000 * 2 ** attempt, 8_000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function requestBody(model: string, prompt: string, json: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  };
  if (json) {
    body.response_format = { type: "json_object" };
  }
  if (model.startsWith("gpt-5")) {
    body.reasoning_effort = "none";
  }
  return body;
}

async function failureReason(response: Response): Promise<string> {
  const code = await errorCode(response);
  if (code === "insufficient_quota" || code === "credit_balance_exhausted") {
    return "The model has no credits remaining.";
  }
  if (response.status === 429) {
    return "The model is rate limited.";
  }
  if (response.status === 401) {
    return "The model rejected the API key.";
  }
  return `Model request failed (${response.status.toString()}).`;
}

async function errorCode(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || !("error" in body)) {
      return "";
    }
    const error = body.error;
    if (typeof error !== "object" || error === null) {
      return "";
    }
    const code = "code" in error && typeof error.code === "string" ? error.code : "";
    const type = "type" in error && typeof error.type === "string" ? error.type : "";
    return code.length > 0 ? code : type;
  } catch {
    return "";
  }
}

function readContent(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("choices" in body) || !Array.isArray(body.choices)) {
    return null;
  }
  const first: unknown = body.choices[0];
  if (typeof first !== "object" || first === null || !("message" in first)) {
    return null;
  }
  const message = first.message;
  if (typeof message !== "object" || message === null || !("content" in message)) {
    return null;
  }
  return typeof message.content === "string" ? message.content : null;
}
