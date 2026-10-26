import { describe, expect, it } from "vitest";
import { domain } from "./index.js";

describe("domain", () => {
  it("loads as a pure module", () => {
    expect(domain.name).toBe("meridian-domain");
  });
});
