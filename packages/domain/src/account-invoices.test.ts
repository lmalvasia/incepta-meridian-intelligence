import { describe, expect, it } from "vitest";
import { invoicesForAccount } from "./account-invoices.js";
import type { InvoiceInput } from "./types.js";

function invoice(overrides: Partial<InvoiceInput>): InvoiceInput {
  return {
    sourceInvoiceId: "INV-1",
    billingSystem: "netsuite",
    invoiceDate: "2026-03-01",
    status: "paid",
    customerRef: "C-0105",
    amount: "10.00",
    serviceLine: "Repair",
    linkStatus: "linked",
    linkReason: "id",
    customerSourceId: "C-0105",
    ...overrides,
  };
}

describe("invoices for one account", () => {
  it("keeps linked, held, and unnamed invoices, including voids", () => {
    const rows = invoicesForAccount(
      [
        invoice({ sourceInvoiceId: "INV-A", invoiceDate: "2026-01-01" }),
        invoice({ sourceInvoiceId: "INV-B", invoiceDate: "2025-06-01", status: "void" }),
        invoice({
          sourceInvoiceId: "INV-C",
          invoiceDate: "2024-04-01",
          linkStatus: "held",
          customerSourceId: null,
          linkReason: "C-0105 and C-0800",
        }),
        invoice({ sourceInvoiceId: "INV-D", customerSourceId: "C-0800", customerRef: "C-0800" }),
      ],
      "C-0105",
    );
    expect(rows.map((row) => row.sourceInvoiceId)).toEqual(["INV-A", "INV-B", "INV-C"]);
  });
});
