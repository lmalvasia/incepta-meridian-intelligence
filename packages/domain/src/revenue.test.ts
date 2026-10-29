import { describe, expect, it } from "vitest";
import { buildRevenue } from "./revenue.js";
import type { InvoiceInput } from "./types.js";

function invoice(overrides: Partial<InvoiceInput>): InvoiceInput {
  return {
    sourceInvoiceId: "INV-1",
    billingSystem: "netsuite",
    invoiceDate: "2026-04-01",
    status: "paid",
    customerRef: "C-0105",
    amount: "10.00",
    serviceLine: "Preventive Maintenance",
    linkStatus: "linked",
    linkReason: "id",
    customerSourceId: "C-0105",
    ...overrides,
  };
}

describe("buildRevenue", () => {
  it("keeps credits, drops voids, and splits assigned, disputed, and unnamed amounts", () => {
    const report = buildRevenue(
      [
        invoice({ amount: "100.00" }),
        invoice({ amount: "-5.00", invoiceDate: "2026-05-01" }),
        invoice({ amount: "40.00", status: "void", invoiceDate: "2026-03-01" }),
        invoice({
          amount: "7.00",
          linkStatus: "held",
          customerSourceId: null,
          linkReason: "C-0138 and C-0800",
          serviceLine: "Project/Install",
        }),
        invoice({ amount: "3.00", linkStatus: "unmatched", customerSourceId: null, customerRef: "C-0251" }),
        invoice({ amount: "999.00", invoiceDate: "2025-02-01", serviceLine: "Repair" }),
      ],
      [{ count: 1, amount: "2.00", invoiceDate: "2026-04-15" }],
    );

    const current = report.periods.find((period) => period.id === "h1-2026");
    expect(current?.billed).toBe("105.00");
    expect(current?.split).toEqual({
      assigned: "95.00",
      disputed: "7.00",
      noCustomer: "3.00",
      excluded: "42.00",
    });
    expect(current?.serviceLines).toEqual([
      { name: "Preventive Maintenance", billed: "98.00" },
      { name: "Project/Install", billed: "7.00" },
    ]);
    expect(report.through).toBe("2026-06-28");
    expect(report.periods.find((period) => period.id === "h1-2025")?.billed).toBe("999.00");
  });
});
