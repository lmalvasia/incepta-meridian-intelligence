import { describe, expect, it } from "vitest";
import { formatDecimal, parseMoney } from "../../utils/money.js";

describe("parseMoney", () => {
  it("parses dollar strings, thousands separators, and a trailing .0", () => {
    expect(parseMoney("$324,074.48")).toEqual({ kind: "amount", cents: 32407448n, decimal: "324074.48" });
    expect(parseMoney("$40,722,837.42")).toEqual({
      kind: "amount",
      cents: 4072283742n,
      decimal: "40722837.42",
    });
    expect(parseMoney("29900.0")).toEqual({ kind: "amount", cents: 2990000n, decimal: "29900.00" });
    expect(parseMoney("1413.57")).toEqual({ kind: "amount", cents: 141357n, decimal: "1413.57" });
    expect(parseMoney("10")).toEqual({ kind: "amount", cents: 1000n, decimal: "10.00" });
  });

  it("treats parentheses and a leading minus as negative", () => {
    expect(parseMoney("($247,536.89)")).toEqual({
      kind: "amount",
      cents: -24753689n,
      decimal: "-247536.89",
    });
    expect(parseMoney("-12.5")).toEqual({ kind: "amount", cents: -1250n, decimal: "-12.50" });
  });

  it("keeps a blank amount blank", () => {
    expect(parseMoney("")).toEqual({ kind: "blank" });
    expect(parseMoney("   ")).toEqual({ kind: "blank" });
  });

  it("rejects values that would need rounding or a guess", () => {
    expect(parseMoney("12.345").kind).toBe("invalid");
    expect(parseMoney("not-money").kind).toBe("invalid");
    expect(parseMoney("($1.00)-").kind).toBe("invalid");
    expect(parseMoney("(-$1.00)").kind).toBe("invalid");
    expect(parseMoney("$").kind).toBe("invalid");
  });
});

describe("formatDecimal", () => {
  it("keeps two fractional digits", () => {
    expect(formatDecimal(0n)).toBe("0.00");
    expect(formatDecimal(-101n)).toBe("-1.01");
  });
});
