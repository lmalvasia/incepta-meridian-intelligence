import { describe, expect, it } from "vitest";
import { buildQuality } from "./quality.js";
import type { IssueInput } from "./types.js";

const blankManager: IssueInput = {
  code: "blank_account_manager",
  severity: "warning",
  description: "account_manager is blank.",
  amountImpact: null,
  subject: "C-0105 Ellery",
};

describe("quality issues", () => {
  it("lists stored issues that do not move billed dollars", () => {
    const report = buildQuality(
      [],
      [],
      [
        blankManager,
        {
          code: "end_date_before_start",
          severity: "error",
          description: "End date is before the start date.",
          amountImpact: null,
          subject: "CTR-1",
        },
      ],
    );
    expect(report.otherIssueCount).toBe(1);
    expect(report.otherIssues).toEqual([blankManager]);
  });
});
