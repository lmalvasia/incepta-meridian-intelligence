import { describe, expect, it } from "vitest";
import { createChatModel } from "./chat.js";

describe("chat model", () => {
  it("returns the assistant text and does not leak the key in an error", async () => {
    const seen: { authorization?: string; reasoning?: unknown; json?: unknown } = {};
    const model = createChatModel({
      apiKey: "secret-key",
      baseUrl: "https://example.test/v1",
      model: "gpt-5.5",
      fetchImpl: async (_url, init) => {
        const headers = new Headers(init?.headers);
        seen.authorization = headers.get("authorization") ?? undefined;
        const body = JSON.parse(String(init?.body)) as { reasoning_effort?: unknown; response_format?: unknown };
        seen.reasoning = body.reasoning_effort;
        seen.json = body.response_format;
        return Response.json({ choices: [{ message: { content: "Classified." } }] });
      },
    });
    await expect(model.complete("Classify.")).resolves.toBe("Classified.");
    expect(seen.authorization).toBe("Bearer secret-key");
    expect(seen.reasoning).toBe("none");
    expect(seen.json).toBeUndefined();
  });

  it("fails without putting the response body in the error", async () => {
    const model = createChatModel({
      apiKey: "secret-key",
      baseUrl: "https://example.test/v1",
      model: "test-model",
      fetchImpl: async () => new Response("secret-key", { status: 401 }),
    });
    await expect(model.complete("Classify.")).rejects.toThrow("The model rejected the API key.");
  });

  it("retries a rate limit and then returns the text", async () => {
    let calls = 0;
    const model = createChatModel({
      apiKey: "secret-key",
      baseUrl: "https://example.test/v1",
      model: "gpt-5.5",
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) {
          return Response.json({ error: { code: "rate_limit_exceeded", message: "slow down" } }, {
            status: 429,
            headers: { "retry-after": "0" },
          });
        }
        return Response.json({ choices: [{ message: { content: "Classified." } }] });
      },
    });
    await expect(model.complete("Classify.")).resolves.toBe("Classified.");
    expect(calls).toBe(2);
  });

  it("names an empty credit balance without copying the response body", async () => {
    const model = createChatModel({
      apiKey: "secret-key",
      baseUrl: "https://example.test/v1",
      model: "test-model",
      fetchImpl: async () => Response.json({ error: { code: "credit_balance_exhausted", message: "secret-key" } }, { status: 429 }),
    });
    await expect(model.complete("Classify.")).rejects.toThrow("The model has no credits remaining.");
  });
});
