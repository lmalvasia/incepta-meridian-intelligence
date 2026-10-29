import { describe, expect, it } from "vitest";
import { buildAccounts } from "./customers.js";
import { noteCoverage } from "./coverage.js";
import { phraseCategory } from "./phrases.js";
import type { CustomerInput, InvoiceInput, NoteInput } from "./types.js";

const customers: CustomerInput[] = [
  { sourceId: "C-0138", displayName: "Longford Shopping Centers", accountManager: "S. Patel", accountStatus: "Active" },
  { sourceId: "C-0800", displayName: "LONGFORD SHOPPING CENTERS", accountManager: "T. Alvarez", accountStatus: "Active" },
  { sourceId: "C-0105", displayName: "Ellery Commercial Realty", accountManager: "S. Patel", accountStatus: "Active" },
];

const invoice: InvoiceInput = {
  sourceInvoiceId: "INV-1",
  billingSystem: "quickbooks",
  invoiceDate: "2024-06-01",
  status: "Paid",
  customerRef: "Longford Shopping Centers",
  amount: "25.00",
  serviceLine: null,
  linkStatus: "held",
  linkReason: "Normalized name matches C-0138 (Longford) and C-0800 (LONGFORD).",
  customerSourceId: null,
};

const note: NoteInput = {
  sourceNoteId: "N-3727",
  noteDate: "2026-02-02",
  noteText: "Monica Tran confirmed they are moving to Therma-Serv at contract end.",
  linkStatus: "linked",
  customerSourceId: "C-0105",
};

describe("accounts and note phrases", () => {
  it("shows a repeated name on both customers and does not add it to either billed total", () => {
    const rows = buildAccounts({ customers, invoices: [invoice], notes: [], contracts: [], modelNotes: null });
    const left = rows.find((row) => row.sourceId === "C-0138");
    const right = rows.find((row) => row.sourceId === "C-0800");
    expect(left?.disputed).toBe("25.00");
    expect(right?.disputed).toBe("25.00");
    expect(left?.currentBilled).toBe("0.00");
    expect(left?.repeatedName).toContain("C-0138");
    expect(left?.repeatedName).toContain("T. Alvarez");
    expect(right?.repeatedName).toBe(left?.repeatedName);
  });

  it("classifies a Therma-Serv note as competitor and agrees when the model says the same", () => {
    expect(phraseCategory(note.noteText)).toBe("competitor");
    const rows = buildAccounts({
      customers,
      invoices: [],
      notes: [note],
      contracts: [],
      modelNotes: [{ noteId: "N-3727", category: "competitor", line: "Moving to Therma-Serv at contract end." }],
    });
    expect(rows.find((row) => row.sourceId === "C-0105")).toMatchObject({
      category: "competitor",
      onWatchList: true,
      quote: note.noteText,
    });
    expect(noteCoverage([note], [{ noteId: "N-3727", category: "positive", line: "Fine." }])).toMatchObject({
      source: "model",
      classified: 1,
      agreement: { matched: 0, known: 1 },
    });
    expect(noteCoverage([note], null).message).toBe("Note categories are not saved. No model has classified these notes.");
    const unclassified = buildAccounts({ customers, invoices: [], notes: [note], contracts: [], modelNotes: null });
    expect(unclassified.find((row) => row.sourceId === "C-0105")).toMatchObject({
      categorySource: "none",
      onWatchList: false,
      quote: note.noteText,
    });
  });

  it("keeps an unnamed billed id on the watch list", () => {
    const rows = buildAccounts({
      customers: [],
      invoices: [
        {
          ...invoice,
          customerRef: "C-0251",
          linkStatus: "unmatched",
          linkReason: "Customer ref C-0251 has no CRM customer.",
          invoiceDate: "2026-01-15",
          amount: "8.00",
        },
      ],
      notes: [],
      contracts: [],
      modelNotes: null,
    });
    expect(rows.find((row) => row.sourceId === "C-0251")).toMatchObject({
      noCrmName: true,
      onWatchList: true,
      currentBilled: "8.00",
    });
  });

  it("puts a broken contract on the review list", () => {
    const ellery = customers.find((customer) => customer.sourceId === "C-0105");
    if (ellery === undefined) {
      throw new Error("Missing C-0105");
    }
    const rows = buildAccounts({
      customers: [ellery],
      invoices: [],
      notes: [],
      contracts: [
        {
          sourceContractId: "CTR-1",
          customerRef: "C-0105",
          startDate: "2026-06-01",
          endDate: "2026-01-01",
          autoRenew: null,
          customerSourceId: "C-0105",
        },
      ],
      modelNotes: null,
    });
    expect(rows[0]).toMatchObject({ brokenContract: true, onWatchList: true, reviewReasons: [] });
  });
});
