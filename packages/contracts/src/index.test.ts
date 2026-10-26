import { describe, expect, it } from "vitest";
import { healthResponseSchema } from "./index.js";

describe("healthResponseSchema", () => {
  it("accepts the API health payload", () => {
    expect(healthResponseSchema.parse({ status: "ok", service: "api" })).toEqual({
      status: "ok",
      service: "api",
    });
  });

  it("rejects a payload from another service", () => {
    expect(healthResponseSchema.safeParse({ status: "ok", service: "web" }).success).toBe(false);
  });
});
