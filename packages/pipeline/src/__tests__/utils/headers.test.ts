import { describe, expect, it } from "vitest";
import { HeaderMismatchError, assertHeaders, headerProblems } from "../../utils/headers.js";

describe("headerProblems", () => {
  it("accepts the same names in a different order", () => {
    expect(
      headerProblems("account_notes.csv", ["note_text", "note_id", "author", "note_date", "customer_name"]),
    ).toEqual({ missing: [], unexpected: [], duplicates: [] });
  });

  it("reports missing, unexpected, and duplicate columns", () => {
    expect(headerProblems("contracts.csv", ["contract_id", "contract_id", "notes"])).toEqual({
      missing: [
        "customer_id",
        "start_date",
        "end_date",
        "annual_value",
        "billing_frequency",
        "auto_renew",
        "service_tier",
      ],
      unexpected: ["notes"],
      duplicates: ["contract_id"],
    });
  });
});

describe("assertHeaders", () => {
  it("throws a message that names the file and the columns", () => {
    expect(() => assertHeaders("crm_customers.csv", ["customer_id", "extra"])).toThrow(HeaderMismatchError);
    try {
      assertHeaders("crm_customers.csv", ["customer_id", "extra"]);
    } catch (error) {
      expect(error).toBeInstanceOf(HeaderMismatchError);
      expect((error as Error).message).toContain("crm_customers.csv");
      expect((error as Error).message).toContain("Missing: company_name");
      expect((error as Error).message).toContain("Unexpected: extra");
    }
  });
});
