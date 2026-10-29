import { describe, expect, it } from "vitest";
import { crmTwinIssues, resolveCustomerName, resolveSourceId } from "../../customers/matching.js";
import type { CrmParty } from "../../customers/types.js";
import { normalizeName } from "../../utils/names.js";

function party(sourceId: string, displayName: string): CrmParty {
  return { sourceId, displayName, normalized: normalizeName(displayName) };
}

const parties = [
  party("C-0800", "LONGFORD SHOPPING CENTERS"),
  party("C-0138", "Longford Shopping Centers"),
  party("C-0277", "Verona Industries"),
  party("C-0248", "Dunmore Shopping Centers"),
  party("C-0784", "Dunmore Shopping Centers, Inc."),
  party("C-0307", "Redstone Property Group"),
  party("C-0787", "Redstone Property Grp"),
  party("C-1111", "Yale Park College"),
  party("C-0105", "Brixton Property Group"),
  party("C-0200", "Verona & Sons"),
];

describe("resolveCustomerName", () => {
  it("links a sole normalized name after case, trim, punctuation, and ampersand folding", () => {
    const verona = resolveCustomerName("  VERONA INDUSTRIES. ", parties);
    expect(verona).toMatchObject({ status: "linked", customerSourceId: "C-0277" });
    expect(verona.reason).toContain("C-0277");

    const ampersand = resolveCustomerName("verona and sons", parties);
    expect(ampersand).toMatchObject({ status: "linked", customerSourceId: "C-0200" });
  });

  it("holds two CRM ids that share a normalized name", () => {
    const longford = resolveCustomerName("Longford Shopping Centers", parties);
    expect(longford.status).toBe("held");
    expect(longford.customerSourceId).toBeNull();
    expect(longford.reason).toContain("C-0138");
    expect(longford.reason.indexOf("C-0138")).toBeLessThan(longford.reason.indexOf("C-0800"));
    expect(longford.reason).toContain("No customer link was stored.");
  });

  it("links a unique prefix and says the link is not an id match", () => {
    const yale = resolveCustomerName("Yale Park", parties);
    expect(yale).toMatchObject({ status: "linked", customerSourceId: "C-1111" });
    expect(yale.reason).toContain("C-1111");
    expect(yale.reason).toContain("name prefix, not an id match");
    expect(yale.reason).not.toContain("No customer link was stored.");
  });

  it("holds a Group/Grp difference", () => {
    const onlyGroup = [party("C-0307", "Redstone Property Group")];
    const abbreviation = resolveCustomerName("Redstone Property Grp", onlyGroup);
    expect(abbreviation).toMatchObject({ status: "held", customerSourceId: null });
    expect(abbreviation.reason).toContain("C-0307");
    expect(abbreviation.reason).toContain("Group/Grp");
  });

  it("does not link an exact name that is also a prefix or Group/Grp neighbor", () => {
    const dunmore = resolveCustomerName("Dunmore Shopping Centers", parties);
    expect(dunmore).toMatchObject({ status: "held", customerSourceId: null });
    expect(dunmore.reason).toContain("C-0248");
    expect(dunmore.reason).toContain("C-0784");

    const redstone = resolveCustomerName("Redstone Property Group", parties);
    expect(redstone).toMatchObject({ status: "held", customerSourceId: null });
    expect(redstone.reason).toContain("C-0307");
    expect(redstone.reason).toContain("C-0787");
  });

  it("leaves an unmatched name unmatched", () => {
    const clinic = resolveCustomerName("Brixton Clinic Group", parties);
    expect(clinic).toMatchObject({ status: "unmatched", customerSourceId: null });
    expect(clinic.reason).toContain("Brixton Clinic Group");
    expect(resolveCustomerName("   ", parties).status).toBe("unmatched");
  });

  it("names the lower CRM id first when the party list is reversed", () => {
    const reversed = [...parties].reverse();
    const longford = resolveCustomerName("LONGFORD SHOPPING CENTERS", reversed);
    expect(longford.reason.indexOf("C-0138")).toBeLessThan(longford.reason.indexOf("C-0800"));
  });
});

describe("resolveSourceId", () => {
  it("links an id that exists in the CRM and leaves a missing id unmatched", () => {
    const ids = new Set(["C-0105"]);
    const known = resolveSourceId(
      "C-0105",
      ids.has("C-0105"),
      "NetSuite customer_ref C-0105 equals CRM customer_id C-0105.",
    );
    expect(known).toEqual({
      status: "linked",
      customerSourceId: "C-0105",
      reason: "NetSuite customer_ref C-0105 equals CRM customer_id C-0105.",
    });

    const missing = resolveSourceId("C-0251", ids.has("C-0251"), "unused");
    expect(missing.status).toBe("unmatched");
    expect(missing.customerSourceId).toBeNull();
    expect(missing.reason).toContain("C-0251");
  });
});

describe("crmTwinIssues", () => {
  it("names the near-duplicate on each CRM customer and leaves unrelated customers alone", () => {
    const twins = crmTwinIssues(parties);
    expect(twins.get("C-0138")).toContain("C-0800");
    expect(twins.get("C-0800")).toContain("C-0138");
    expect(twins.get("C-0138")).toContain("stay separate customers");
    expect(twins.get("C-0248")).toContain("C-0784");
    expect(twins.get("C-0784")).toContain("dunmore shopping centers");
    expect(twins.get("C-0307")).toContain("C-0787");
    expect(twins.get("C-0307")).toContain("Group/Grp");
    expect(twins.get("C-0277")).toBeUndefined();
    expect(twins.get("C-0105")).toBeUndefined();
  });
});
