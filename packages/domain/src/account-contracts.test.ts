import { describe, expect, it } from "vitest";
import { contractsForAccount } from "./account-contracts.js";
import type { ContractInput, InvoiceInput } from "./types.js";

const invoice: InvoiceInput = {
  sourceInvoiceId: "INV-1",
  billingSystem: "netsuite",
  invoiceDate: "2026-02-01",
  status: "paid",
  customerRef: "C-0105",
  amount: "105.00",
  serviceLine: "Preventive Maintenance",
  linkStatus: "linked",
  linkReason: "id",
  customerSourceId: "C-0105",
};

function contract(patch: Partial<ContractInput>): ContractInput {
  return {
    sourceContractId: "CTR-1",
    customerRef: "C-0105",
    startDate: "2025-01-01",
    endDate: "2026-03-31",
    autoRenew: "Yes",
    customerSourceId: "C-0105",
    ...patch,
  };
}

describe("contracts for one account", () => {
  it("marks an ended contract that still has H1 2026 invoices", () => {
    const rows = contractsForAccount([contract({})], [invoice], "C-0105");
    expect(rows).toEqual([
      {
        sourceContractId: "CTR-1",
        startDate: "2025-01-01",
        endDate: "2026-03-31",
        autoRenew: "Yes",
        state: "ended",
        stillBilling: true,
      },
    ]);
  });

  it("keeps a later open contract ahead of an ended one and ignores another customer", () => {
    const rows = contractsForAccount(
      [
        contract({ sourceContractId: "CTR-OLD", endDate: "2026-03-31" }),
        contract({ sourceContractId: "CTR-NEW", endDate: "2027-01-01", autoRenew: null }),
        contract({ sourceContractId: "CTR-OTHER", customerSourceId: "C-0999", customerRef: "C-0999" }),
      ],
      [{ ...invoice, invoiceDate: "2025-02-01" }],
      "C-0105",
    );
    expect(rows.map((row) => row.sourceContractId)).toEqual(["CTR-NEW", "CTR-OLD"]);
    expect(rows[0]).toMatchObject({ state: "open", stillBilling: false, autoRenew: null });
    expect(rows[1]).toMatchObject({ state: "ended", stillBilling: false });
  });

  it("treats an end date before the start date as broken, including an unmatched id", () => {
    const rows = contractsForAccount(
      [contract({ endDate: "2024-01-01", customerSourceId: null, customerRef: "C-0553" })],
      [],
      "C-0553",
    );
    expect(rows[0]).toMatchObject({ state: "broken", stillBilling: false });
  });
});
