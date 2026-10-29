import { describe, expect, it } from "vitest";
import { buildImportPlan } from "../../import/plan.js";
import type { FilePlan, ImportPlan, SourceText } from "../../import/types.js";
import { HeaderMismatchError } from "../../utils/headers.js";
import { IssueCode } from "../../utils/issues.js";
import { REQUIRED_SOURCES } from "../../sources/discover.js";

const HEADERS = {
  "crm_customers.csv":
    "customer_id,company_name,industry,city,state,account_manager,created_date,status",
  "contracts.csv":
    "contract_id,customer_id,start_date,end_date,annual_value,billing_frequency,auto_renew,service_tier",
  "invoices_2025_2026_netsuite.csv":
    "invoice_id,customer_ref,txn_date,amount_usd,currency,status,service_line",
  "invoices_2024_quickbooks.csv": "Invoice No,Customer,Invoice Date,Amount,Status,Memo",
  "account_notes.csv": "note_id,customer_name,note_date,author,note_text",
} as const;

function planFor(overrides: Partial<Record<keyof typeof HEADERS, string>>): ImportPlan {
  const inputs: SourceText[] = REQUIRED_SOURCES.map((source) => {
    const body = overrides[source.fileName] ?? `${HEADERS[source.fileName]}\n`;
    return {
      fileName: source.fileName,
      sourceSystem: source.sourceSystem,
      byteSize: body.length,
      text: body,
    };
  });
  return buildImportPlan(inputs);
}

function file(plan: ImportPlan, fileName: string): FilePlan {
  const found = plan.files.find((item) => item.fileName === fileName);
  if (found === undefined) {
    throw new Error(`Missing ${fileName}`);
  }
  return found;
}

function codes(planFile: FilePlan, sourceKey: string): string[] {
  const customer = planFile.customers.find((row) => row.sourceId === sourceKey);
  const invoice = planFile.invoices.find((row) => row.sourceInvoiceId === sourceKey);
  const contract = planFile.contracts.find((row) => row.sourceContractId === sourceKey);
  const note = planFile.notes.find((row) => row.sourceNoteId === sourceKey);
  const skipped = planFile.skipped.find((row) => row.key === sourceKey);
  const issues = customer?.issues ?? invoice?.issues ?? contract?.issues ?? note?.issues ?? skipped?.issues ?? [];
  return issues.map((issue) => issue.code);
}

describe("buildImportPlan", () => {
  it("does not treat the QuickBooks header or TOTAL row as invoices", () => {
    const plan = planFor({
      "invoices_2024_quickbooks.csv": [
        HEADERS["invoices_2024_quickbooks.csv"],
        'INV-1,Acme,01/15/2024,"$10.00",Paid,Visit',
        "Invoice No,Customer,Invoice Date,Amount,Status,Memo",
        ',TOTAL,,"$10.00",,',
      ].join("\n"),
    });
    const quickbooks = file(plan, "invoices_2024_quickbooks.csv");

    expect(quickbooks.invoices.map((invoice) => invoice.sourceInvoiceId)).toEqual(["INV-1"]);
    expect(quickbooks.readCount).toBe(3);
    expect(quickbooks.skippedCount).toBe(2);
    expect(quickbooks.skipped.some((row) => row.key === "Invoice No")).toBe(true);
    const total = quickbooks.skipped.find((row) => row.key === "TOTAL");
    expect(total?.issues[0]).toMatchObject({
      code: IssueCode.reconciliationTotal,
      severity: "info",
      amountImpact: "10.00",
    });
    expect(quickbooks.flaggedCount).toBe(1);
  });

  it("records a TOTAL mismatch without adding that row to the invoices", () => {
    const plan = planFor({
      "invoices_2024_quickbooks.csv": [
        HEADERS["invoices_2024_quickbooks.csv"],
        "INV-1,Acme,01/15/2024,$10.00,Paid,Visit",
        ",TOTAL,,$12.00,,",
      ].join("\n"),
    });
    const total = file(plan, "invoices_2024_quickbooks.csv").skipped.find((row) => row.key === "TOTAL");
    expect(total?.issues[0]?.severity).toBe("error");
    expect(total?.issues[0]?.description).toContain("12.00");
    expect(total?.issues[0]?.description).toContain("10.00");
  });

  it("does not store a malformed invoice", () => {
    const plan = planFor({
      "invoices_2024_quickbooks.csv": [
        HEADERS["invoices_2024_quickbooks.csv"],
        "INV-1,Acme,01/15/2024,not-money,Paid,Visit",
        "INV-2,Acme,02/31/2024,$5.00,Paid,Visit",
      ].join("\n"),
    });
    const quickbooks = file(plan, "invoices_2024_quickbooks.csv");
    expect(quickbooks.invoices).toEqual([]);
    expect(quickbooks.skippedCount).toBe(2);
    expect(codes(quickbooks, "INV-1")).toContain(IssueCode.invalidAmount);
    expect(codes(quickbooks, "INV-2")).toContain(IssueCode.invalidDate);
  });

  it("collapses identical invoice copies and keeps the first amount when a copy conflicts", () => {
    const identical = planFor({
      "crm_customers.csv": [
        HEADERS["crm_customers.csv"],
        "C-9001,Fixture Co,Retail,Test,NY,S. Patel,2024-01-02,Active",
      ].join("\n"),
      "invoices_2025_2026_netsuite.csv": [
        HEADERS["invoices_2025_2026_netsuite.csv"],
        "NS-1,C-9001,2025-01-01,10.50,USD,open,Repair",
        "NS-1,C-9001,2025-01-01,10.50,USD,open,Repair",
      ].join("\n"),
    });
    const netsuite = file(identical, "invoices_2025_2026_netsuite.csv");
    expect(netsuite.invoices).toHaveLength(1);
    expect(netsuite.invoices[0]?.amount).toBe("10.50");
    expect(netsuite.skippedCount).toBe(1);
    expect(netsuite.collapsedCopies).toBe(1);
    expect(netsuite.collapsedCents).toBe(1050n);
    expect(netsuite.invoices[0]?.link).toMatchObject({ status: "linked", customerSourceId: "C-9001" });

    const conflict = planFor({
      "invoices_2025_2026_netsuite.csv": [
        HEADERS["invoices_2025_2026_netsuite.csv"],
        "NS-1,C-9001,2025-01-01,10.00,USD,open,Repair",
        "NS-1,C-9001,2025-01-01,11.00,USD,open,Repair",
      ].join("\n"),
    });
    const conflicted = file(conflict, "invoices_2025_2026_netsuite.csv");
    expect(conflicted.invoices.map((invoice) => invoice.amount)).toEqual(["10.00"]);
    expect(conflicted.collapsedCopies).toBe(0);
    expect(conflicted.skipped.some((row) => row.key === "NS-1#line3")).toBe(true);
    expect(codes(conflicted, "NS-1")).toContain(IssueCode.conflictingSourceRow);
  });

  it("stores a blank contract amount as null and keeps an end date before the start", () => {
    const plan = planFor({
      "crm_customers.csv": [
        HEADERS["crm_customers.csv"],
        "C-9001,Fixture Co,Retail,Test,NY,S. Patel,2024-01-02,Active",
      ].join("\n"),
      "contracts.csv": [
        HEADERS["contracts.csv"],
        "CTR-1,C-9001,2024-01-01,2025-01-01,,Monthly,Yes,Gold",
        "CTR-2,C-9001,2024-06-01,2022-06-01,145000.0,Monthly,Yes,Gold",
        "CTR-3,C-4040,2024-01-01,2025-01-01,10.0,Monthly,,Bronze",
      ].join("\n"),
    });
    const contracts = file(plan, "contracts.csv");
    expect(contracts.contracts.find((contract) => contract.sourceContractId === "CTR-1")).toMatchObject({
      annualValue: null,
      link: { status: "linked", customerSourceId: "C-9001" },
    });
    expect(codes(contracts, "CTR-1")).toContain(IssueCode.blankAnnualValue);
    expect(codes(contracts, "CTR-2")).toContain(IssueCode.endDateBeforeStart);
    expect(contracts.contracts.find((contract) => contract.sourceContractId === "CTR-2")).toMatchObject({
      startDate: "2024-06-01",
      endDate: "2022-06-01",
      annualValue: "145000.00",
    });
    expect(contracts.contracts.find((contract) => contract.sourceContractId === "CTR-3")).toMatchObject({
      autoRenew: null,
      link: { status: "unmatched", customerSourceId: null },
    });
    expect(codes(contracts, "CTR-3")).toEqual(
      expect.arrayContaining([IssueCode.blankAutoRenew, IssueCode.unknownCustomerRef]),
    );
  });

  it("parses parentheses as credits", () => {
    const plan = planFor({
      "invoices_2024_quickbooks.csv": [
        HEADERS["invoices_2024_quickbooks.csv"],
        'INV-1,Acme,"Jul 03, 2024","($247,536.89)",Paid,Credit memo - billing adjustment',
      ].join("\n"),
    });
    const invoice = file(plan, "invoices_2024_quickbooks.csv").invoices[0];
    expect(invoice).toMatchObject({
      amount: "-247536.89",
      invoiceDate: "2024-07-03",
      currency: null,
      link: { status: "unmatched", customerSourceId: null },
    });
  });

  it("keeps ambiguous CRM dates and does not merge similar customer names", () => {
    const plan = planFor({
      "crm_customers.csv": [
        HEADERS["crm_customers.csv"],
        "C-0138,Longford Shopping Centers,Retail,New Rochelle,NY,S. Patel,06/07/2023,Active",
        "C-0800,LONGFORD SHOPPING CENTERS,Retail,New Rochelle,NY,,02/02/2024,Active",
        "C-0307,Redstone Property Group,Property Management,White Plains,NY,J. Kim,2024-01-01,Active",
        "C-0787,Redstone Property Grp,Property Management,White Plains,NY,S. Patel,2024-02-01,Active",
        "C-1111,Yale Park College,Education,New Haven,CT,S. Patel,2024-01-01,Active",
      ].join("\n"),
      "invoices_2024_quickbooks.csv": [
        HEADERS["invoices_2024_quickbooks.csv"],
        "INV-1,Longford Shopping Centers,01/15/2024,$10.00,Paid,Visit",
        "INV-2,Brixton Clinic Group,01/16/2024,$12.00,Open,Visit",
      ].join("\n"),
      "account_notes.csv": [
        HEADERS["account_notes.csv"],
        "N-1,Redstone Property,2025-02-04,J. Kim,Annual review.",
        "N-2,Yale Park,2025-03-01,S. Patel,Site visit.",
        "N-3,Pinnacle Office REIT,2026-02-21,S. Patel,Prospect meeting.",
      ].join("\n"),
    });

    const customers = file(plan, "crm_customers.csv");
    expect(customers.customers).toHaveLength(5);
    expect(codes(customers, "C-0138")).toEqual(
      expect.arrayContaining([IssueCode.ambiguousCreatedDate, IssueCode.possibleDuplicateCustomer]),
    );
    expect(customers.customers.find((customer) => customer.sourceId === "C-0138")?.createdOn).toBe("2023-06-07");
    expect(codes(customers, "C-0800")).toEqual(
      expect.arrayContaining([IssueCode.blankAccountManager, IssueCode.possibleDuplicateCustomer]),
    );
    expect(codes(customers, "C-0307")).toContain(IssueCode.possibleDuplicateCustomer);
    expect(codes(customers, "C-0787")).toContain(IssueCode.possibleDuplicateCustomer);

    const quickbooks = file(plan, "invoices_2024_quickbooks.csv");
    const longford = quickbooks.invoices.find((invoice) => invoice.sourceInvoiceId === "INV-1");
    expect(longford?.link.status).toBe("held");
    expect(longford?.link.customerSourceId).toBeNull();
    expect(longford?.link.reason).toContain("C-0138");
    expect(longford?.link.reason).toContain("C-0800");
    expect(codes(quickbooks, "INV-1")).toContain(IssueCode.ambiguousCustomerName);
    expect(codes(quickbooks, "INV-2")).toContain(IssueCode.unmatchedCustomerName);
    expect(quickbooks.invoices.find((invoice) => invoice.sourceInvoiceId === "INV-2")?.link.customerSourceId).toBeNull();

    const notes = file(plan, "account_notes.csv");
    const redstone = notes.notes.find((note) => note.sourceNoteId === "N-1");
    expect(redstone?.link.status).toBe("held");
    expect(redstone?.link.customerSourceId).toBeNull();
    expect(redstone?.link.reason).toContain("C-0307");
    expect(redstone?.link.reason).toContain("C-0787");
    const yale = notes.notes.find((note) => note.sourceNoteId === "N-2");
    expect(yale?.link).toMatchObject({ status: "linked", customerSourceId: "C-1111" });
    expect(yale?.link.reason).toContain("name prefix, not an id match");
    const prospect = notes.notes.find((note) => note.sourceNoteId === "N-3");
    expect(prospect?.link.status).toBe("unmatched");
    expect(codes(notes, "N-3")).toContain(IssueCode.unmatchedCustomerName);
  });

  it("links a NetSuite id that equals a CRM id and warns once for an unknown ref", () => {
    const plan = planFor({
      "crm_customers.csv": [
        HEADERS["crm_customers.csv"],
        "C-9001,Fixture Co,Retail,Test,NY,S. Patel,2024-01-02,Active",
      ].join("\n"),
      "invoices_2025_2026_netsuite.csv": [
        HEADERS["invoices_2025_2026_netsuite.csv"],
        "NS-2,C-9001,2025-02-01,5.00,USD,paid,Repair",
        "NS-1,C-4040,2025-01-01,8.00,USD,open,Repair",
        "NS-3,C-4040,2025-03-01,9.00,USD,void,Repair",
      ].join("\n"),
    });
    const netsuite = file(plan, "invoices_2025_2026_netsuite.csv");
    const known = netsuite.invoices.find((invoice) => invoice.sourceInvoiceId === "NS-2");
    expect(known?.link).toEqual({
      status: "linked",
      customerSourceId: "C-9001",
      reason: "NetSuite customer_ref C-9001 equals CRM customer_id C-9001.",
    });
    const unknown = netsuite.invoices.filter((invoice) => invoice.customerRef === "C-4040");
    expect(unknown.every((invoice) => invoice.link.status === "unmatched" && invoice.link.customerSourceId === null)).toBe(
      true,
    );
    expect(codes(netsuite, "NS-1")).toContain(IssueCode.unknownCustomerRef);
    expect(codes(netsuite, "NS-3")).not.toContain(IssueCode.unknownCustomerRef);
    expect(netsuite.invoices.find((invoice) => invoice.sourceInvoiceId === "NS-3")?.status).toBe("void");
  });

  it("links one normalized name and holds an exact name that also prefixes a twin", () => {
    const plan = planFor({
      "crm_customers.csv": [
        HEADERS["crm_customers.csv"],
        "C-0277,Verona Industries,Manufacturing,Edison,NJ,S. Patel,2024-01-02,Active",
        "C-0248,Dunmore Shopping Centers,Retail,Brooklyn,NY,S. Patel,2024-01-02,Active",
        "C-0784,\"Dunmore Shopping Centers, Inc.\",Retail,Brooklyn,NY,J. Kim,2024-02-02,Active",
        "C-0307,Redstone Property Group,Property Management,White Plains,NY,J. Kim,2024-01-01,Active",
        "C-0787,Redstone Property Grp,Property Management,White Plains,NY,S. Patel,2024-02-01,Active",
      ].join("\n"),
      "invoices_2024_quickbooks.csv": [
        HEADERS["invoices_2024_quickbooks.csv"],
        "INV-1,VERONA INDUSTRIES,01/15/2024,$10.00,Paid,Visit",
        "INV-2,Dunmore Shopping Centers,01/16/2024,$12.00,Open,Visit",
        "INV-3,Redstone Property Group,01/17/2024,$8.00,Paid,Visit",
        "INV-4,  Verona   Industries ,01/18/2024,$9.00,Paid,Visit",
      ].join("\n"),
    });

    const customers = file(plan, "crm_customers.csv");
    expect(codes(customers, "C-0248")).toContain(IssueCode.possibleDuplicateCustomer);
    expect(codes(customers, "C-0784")).toContain(IssueCode.possibleDuplicateCustomer);
    expect(codes(customers, "C-0277")).not.toContain(IssueCode.possibleDuplicateCustomer);

    const quickbooks = file(plan, "invoices_2024_quickbooks.csv");
    expect(quickbooks.invoices.find((invoice) => invoice.sourceInvoiceId === "INV-1")?.link).toMatchObject({
      status: "linked",
      customerSourceId: "C-0277",
    });
    expect(quickbooks.invoices.find((invoice) => invoice.sourceInvoiceId === "INV-4")).toMatchObject({
      customerRef: "  Verona   Industries ",
      link: { status: "linked", customerSourceId: "C-0277" },
    });

    const dunmore = quickbooks.invoices.find((invoice) => invoice.sourceInvoiceId === "INV-2");
    expect(dunmore?.link.status).toBe("held");
    expect(dunmore?.link.customerSourceId).toBeNull();
    expect(dunmore?.link.reason).toContain("C-0248");
    expect(dunmore?.link.reason).toContain("C-0784");
    expect(codes(quickbooks, "INV-2")).toContain(IssueCode.ambiguousCustomerName);

    const redstone = quickbooks.invoices.find((invoice) => invoice.sourceInvoiceId === "INV-3");
    expect(redstone?.link.status).toBe("held");
    expect(redstone?.link.reason).toContain("C-0307");
    expect(redstone?.link.reason).toContain("C-0787");
  });

  it("fails when a required header is missing or unexpected", () => {
    expect(() =>
      planFor({
        "crm_customers.csv": "customer_id,company_name\nC-9001,Acme\n",
      }),
    ).toThrow(HeaderMismatchError);
  });
});
