import { describe, expect, it } from "vitest";
import { parseDate, utcDate } from "../../utils/dates.js";

describe("parseDate", () => {
  it("parses ISO, US slash, and QuickBooks month names", () => {
    expect(parseDate("2023-07-07")).toEqual({ kind: "date", iso: "2023-07-07", ambiguous: false });
    expect(parseDate("11/21/2019")).toEqual({ kind: "date", iso: "2019-11-21", ambiguous: false });
    expect(parseDate("Jul 03, 2024")).toEqual({ kind: "date", iso: "2024-07-03", ambiguous: false });
  });

  it("stores month/day and marks slash dates that are also valid day/month", () => {
    expect(parseDate("02/03/2024")).toEqual({ kind: "date", iso: "2024-02-03", ambiguous: true });
    expect(parseDate("02/02/2024")).toEqual({ kind: "date", iso: "2024-02-02", ambiguous: false });
  });

  it("does not flip an impossible month into day/month", () => {
    expect(parseDate("13/01/2024").kind).toBe("invalid");
    expect(parseDate("02/31/2024").kind).toBe("invalid");
    expect(parseDate("February 1, 2024").kind).toBe("invalid");
  });

  it("keeps a blank date blank", () => {
    expect(parseDate("")).toEqual({ kind: "blank" });
    expect(parseDate(" ")).toEqual({ kind: "blank" });
  });
});

describe("utcDate", () => {
  it("builds a UTC midnight so the calendar day does not shift", () => {
    expect(utcDate("2024-01-02").toISOString()).toBe("2024-01-02T00:00:00.000Z");
  });
});
