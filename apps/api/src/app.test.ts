import { healthResponseSchema } from "@meridian/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { createAppContext, type AppContext } from "./composition.js";

describe("api", () => {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("reports health without a database", async () => {
    const context = createAppContext();
    app = await buildApp(context);

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.parse(response.json())).toEqual({
      status: "ok",
      service: "api",
    });
    expect(context.domain.name).toBe("meridian-domain");
    await expect(context.noteAnalyzer.analyzeNotes(["note"])).resolves.toMatchObject({
      status: "unavailable",
    });
  });

  it("reports ready when the database check succeeds", async () => {
    app = await buildApp(readyContext(async () => undefined));

    const response = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("reports unavailable when the database check fails", async () => {
    app = await buildApp(
      readyContext(async () => {
        throw new Error("connection refused");
      }),
    );

    const response = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: "unavailable" });
  });
});

function readyContext(checkDatabase: AppContext["checkDatabase"]): AppContext {
  const context = createAppContext();
  return { ...context, checkDatabase };
}
