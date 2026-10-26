import { describe, expect, it } from "vitest";
import { createDb } from "./index.js";

describe("createDb", () => {
  it("fails clearly when DATABASE_URL is missing", () => {
    expect(() => createDb("")).toThrow("DATABASE_URL is not set.");
  });
});
