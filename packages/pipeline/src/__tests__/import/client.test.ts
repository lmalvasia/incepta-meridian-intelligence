import { describe, expect, it } from "vitest";
import { summarizeLinks } from "../../import/summary.js";
import { loadImportPlan } from "../../import/plan.js";
import type { FilePlan } from "../../import/types.js";
import { IssueCode } from "../../utils/issues.js";
import { formatDecimal } from "../../utils/money.js";
import { defaultSourceDirectory } from "../../sources/repo.js";

function byName(files: FilePlan[], fileName: string): FilePlan {
  const found = files.find((file) => file.fileName === fileName);
  if (found === undefined) {
    throw new Error(`Missing ${fileName}`);
  }
  return found;
}

function invoice(file: FilePlan, customerRef: string) {
  return file.invoices.find((row) => row.customerRef === customerRef);
}

function note(file: FilePlan, customerName: string) {
  return file.notes.find((row) => row.customerName === customerName);
}

describe("client exports", () => {
  it("classifies the five files in data/raw", async () => {
    const { plan } = await loadImportPlan(defaultSourceDirectory());
    const customers = byName(plan.files, "crm_customers.csv");
    const contracts = byName(plan.files, "contracts.csv");
    const netsuite = byName(plan.files, "invoices_2025_2026_netsuite.csv");
    const quickbooks = byName(plan.files, "invoices_2024_quickbooks.csv");
    const notes = byName(plan.files, "account_notes.csv");

    expect(customers.customers).toHaveLength(173);
    expect(customers.skippedCount).toBe(0);
    expect(customers.customers.filter((row) => row.issues.some((issue) => issue.code === IssueCode.ambiguousCreatedDate))).toHaveLength(48);
    expect(customers.customers.filter((row) => row.issues.some((issue) => issue.code === IssueCode.blankAccountManager))).toHaveLength(17);

    expect(quickbooks.invoices).toHaveLength(2559);
    expect(quickbooks.readCount).toBe(2561);
    expect(quickbooks.skippedCount).toBe(2);
    expect(quickbooks.invoices.filter((row) => row.amount.startsWith("-"))).toHaveLength(73);
    expect(quickbooks.skipped.find((row) => row.key === "TOTAL")?.issues[0]?.severity).toBe("info");
    expect(quickbooks.invoices.some((row) => row.sourceInvoiceId === "TOTAL")).toBe(false);
    expect(quickbooks.invoices.filter((row) => row.issues.some((issue) => issue.code === IssueCode.ambiguousCustomerName))).toHaveLength(201);
    expect(quickbooks.invoices.filter((row) => row.issues.some((issue) => issue.code === IssueCode.unmatchedCustomerName))).toHaveLength(4);

    expect(netsuite.invoices).toHaveLength(4061);
    expect(netsuite.readCount).toBe(4106);
    expect(netsuite.skippedCount).toBe(45);
    expect(netsuite.collapsedCopies).toBe(45);
    expect(formatDecimal(netsuite.collapsedCents)).toBe("939504.97");
    expect(netsuite.invoices.filter((row) => row.link.status === "linked")).toHaveLength(3961);
    expect(netsuite.invoices.filter((row) => row.issues.some((issue) => issue.code === IssueCode.unknownCustomerRef))).toHaveLength(4);

    expect(contracts.contracts).toHaveLength(165);
    expect(contracts.readCount).toBe(167);
    expect(contracts.skippedCount).toBe(2);
    expect(contracts.collapsedCopies).toBe(2);
    expect(contracts.contracts.filter((row) => row.annualValue === null)).toHaveLength(5);
    expect(contracts.contracts.filter((row) => row.issues.some((issue) => issue.code === IssueCode.endDateBeforeStart))).toHaveLength(6);

    expect(notes.notes).toHaveLength(263);
    expect(notes.skippedCount).toBe(0);
    expect(notes.notes.filter((row) => row.issues.some((issue) => issue.code === IssueCode.unmatchedCustomerName))).toHaveLength(3);

    expect(invoice(netsuite, "C-0105")?.link).toMatchObject({ status: "linked", customerSourceId: "C-0105" });
    expect(invoice(netsuite, "C-0251")?.link.status).toBe("unmatched");
    expect(
      [...new Set(contracts.contracts.filter((row) => row.link.status === "unmatched").map((row) => row.customerRef))].sort(),
    ).toEqual(["C-0251", "C-0585", "C-0599", "C-0751"]);
    expect(contracts.contracts.find((row) => row.customerRef === "C-0105")?.link).toMatchObject({
      status: "linked",
      customerSourceId: "C-0105",
    });
    expect(contracts.contracts.find((row) => row.customerRef === "C-0251")?.link.customerSourceId).toBeNull();

    expect(invoice(quickbooks, "VERONA INDUSTRIES")?.link).toMatchObject({
      status: "linked",
      customerSourceId: "C-0277",
    });
    const longford = invoice(quickbooks, "Longford Shopping Centers");
    expect(longford?.link.status).toBe("held");
    expect(longford?.link.reason).toContain("C-0138");
    expect(longford?.link.reason).toContain("C-0800");
    const kestrel = invoice(quickbooks, "Kestrel Retail Group.");
    expect(kestrel?.link.status).toBe("held");
    expect(kestrel?.link.reason).toContain("C-0156");
    expect(kestrel?.link.reason).toContain("C-0795");
    const dunmore = invoice(quickbooks, "Dunmore Shopping Centers");
    expect(dunmore?.link.status).toBe("held");
    expect(dunmore?.link.reason).toContain("C-0248");
    expect(dunmore?.link.reason).toContain("C-0784");
    expect(invoice(quickbooks, "Brixton Clinic Group")?.link.status).toBe("unmatched");

    expect(note(notes, "brixton fabrication")?.link).toMatchObject({ status: "linked", customerSourceId: "C-0706" });
    const redstone = note(notes, "Redstone Property");
    expect(redstone?.link.status).toBe("held");
    expect(redstone?.link.reason).toContain("C-0307");
    expect(redstone?.link.reason).toContain("C-0787");
    const yale = note(notes, "Yale Park");
    expect(yale?.link).toMatchObject({ status: "linked", customerSourceId: "C-0744" });
    expect(yale?.link.reason).toContain("name prefix, not an id match");
    expect(note(notes, "Pinnacle Office REIT")?.link.status).toBe("unmatched");

    const report = summarizeLinks(plan);
    expect(report.crmNearDuplicates).toBe(24);
    expect(report.linked.identities).toBe(641);
    expect(report.held.identities).toBe(35);
    expect(report.unmatched.identities).toBe(15);
    expect(report.linked.dollars).toBe("101220377.11");
    expect(report.held.dollars).toBe("2079229.29");
    expect(report.unmatched.dollars).toBe("1652940.04");
    expect(report.systems).toEqual([
      {
        source: "contracts.csv",
        linked: { identities: 161, dollars: "0.00" },
        held: { identities: 0, dollars: "0.00" },
        unmatched: { identities: 4, dollars: "0.00" },
      },
      {
        source: "invoices_2025_2026_netsuite.csv",
        linked: { identities: 169, dollars: "63256506.41" },
        held: { identities: 0, dollars: "0.00" },
        unmatched: { identities: 4, dollars: "973202.61" },
      },
      {
        source: "invoices_2024_quickbooks.csv",
        linked: { identities: 183, dollars: "37963870.70" },
        held: { identities: 26, dollars: "2079229.29" },
        unmatched: { identities: 4, dollars: "679737.43" },
      },
      {
        source: "account_notes.csv",
        linked: { identities: 128, dollars: "0.00" },
        held: { identities: 9, dollars: "0.00" },
        unmatched: { identities: 3, dollars: "0.00" },
      },
    ]);
  });
});
