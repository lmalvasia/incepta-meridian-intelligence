import { describe, expect, it } from "vitest";
import { groupAbbreviationPair, nameRelation, normalizeName } from "../../utils/names.js";

describe("normalizeName", () => {
  it("trims, case-folds, expands ampersands, and drops punctuation", () => {
    expect(normalizeName(" Kestrel Retail Group. ")).toBe("kestrel retail group");
    expect(normalizeName("LONGFORD SHOPPING CENTERS")).toBe("longford shopping centers");
    expect(normalizeName("A & B")).toBe("a and b");
    expect(normalizeName("Redstone Property Grp")).toBe("redstone property grp");
  });
});

describe("nameRelation", () => {
  it("treats an equal normalized name as exact and a token prefix as prefix", () => {
    expect(nameRelation("Yale Park", "Yale Park College")).toBe("prefix");
    expect(nameRelation("Yale Park College", "Yale Park")).toBe("prefix");
    expect(nameRelation("Kestrel Retail Group.", "KESTREL RETAIL GROUP")).toBe("exact");
    expect(nameRelation("Redstone Property", "Redstone Property Group")).toBe("prefix");
    expect(nameRelation("Redstone Property Group", "Redstone Property Grp")).toBe("none");
    expect(nameRelation("Brixton Clinic Group", "Brixton Property Group")).toBe("none");
  });
});

describe("groupAbbreviationPair", () => {
  it("pairs Group with Grp and leaves other token changes alone", () => {
    expect(groupAbbreviationPair("Redstone Property Group", "Redstone Property Grp")).toBe(true);
    expect(groupAbbreviationPair("Redstone Property Group", "Redstone Market Group")).toBe(false);
  });
});
