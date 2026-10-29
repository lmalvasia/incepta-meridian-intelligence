import { customersResponseSchema, revenueAnalysisResponseSchema, revenueResponseSchema } from "@meridian/contracts";
import type { NoteClassification, RevenueAnalysis } from "@meridian/ai";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { createAppContext, type AppContext } from "../composition.js";
import type { AnalysisRecordStore, StoredAnalysis } from "../analysis/analysis-records.js";
import type { NoteRecordStore, StoredNote } from "../analysis/note-records.js";
import type { Snapshot } from "../types/snapshot.js";

const snapshot: Snapshot = {
  customers: [
    { sourceId: "C-0105", displayName: "Ellery Commercial Realty", accountManager: "S. Patel", accountStatus: "Active" },
  ],
  invoices: [
    {
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
    },
  ],
  notes: [
    {
      sourceNoteId: "N-1",
      noteDate: "2026-02-02",
      noteText: "Monica Tran confirmed they are moving to Therma-Serv at contract end.",
      linkStatus: "linked",
      customerSourceId: "C-0105",
    },
  ],
  contracts: [
    {
      sourceContractId: "CTR-1",
      customerRef: "C-0105",
      startDate: "2025-01-01",
      endDate: "2027-01-01",
      autoRenew: "Yes",
      customerSourceId: "C-0105",
    },
  ],
  issues: [
    {
      code: "blank_account_manager",
      severity: "warning",
      description: "account_manager is blank.",
      amountImpact: null,
      subject: "C-0105",
    },
  ],
  collapsedCopies: [],
};

describe("dashboard routes", () => {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("returns billed figures and leaves note categories unclassified when no model is configured", async () => {
    let classifyCalls = 0;
    app = await buildApp(
      fixtureContext(async () => {
        classifyCalls += 1;
        return { status: "unavailable", reason: "No LLM provider is configured." };
      }),
    );

    const revenue = await app.inject({ method: "GET", url: "/revenue" });
    const customers = await app.inject({ method: "GET", url: "/customers" });
    expect(revenue.statusCode).toBe(200);
    expect(revenueResponseSchema.parse(revenue.json()).periods.find((period) => period.id === "h1-2026")?.billed).toBe(
      "105.00",
    );
    const body = customersResponseSchema.parse(customers.json());
    expect(body.coverage.message).toBe("Note categories are not saved. No model has classified these notes.");
    expect(body.accounts[0]).toMatchObject({ sourceId: "C-0105", categorySource: "none", onWatchList: false });
    const coverage = await app.inject({ method: "GET", url: "/notes/coverage" });
    expect(coverage.statusCode).toBe(200);
    expect(coverage.json()).toMatchObject({
      message: "Note categories are not saved. No model has classified these notes.",
    });
    expect(classifyCalls).toBe(0);
    const invoices = await app.inject({ method: "GET", url: "/customers/C-0105/invoices" });
    expect(invoices.statusCode).toBe(200);
    expect(invoices.json()).toMatchObject({
      sourceId: "C-0105",
      invoices: [{ sourceInvoiceId: "INV-1", amount: "105.00" }],
      contracts: [{ sourceContractId: "CTR-1", state: "open", stillBilling: true, autoRenew: "Yes" }],
      notes: [{ sourceNoteId: "N-1", category: "unlabeled", chosen: true }],
    });
  });

  it("rejects an analysis that invents an amount", async () => {
    app = await buildApp(
      fixtureContext(async () => ({ status: "unavailable", reason: "unused" }), async () => ({
        status: "rejected",
        text: "The gap is $999,999.",
      })),
    );
    const response = await app.inject({ method: "POST", url: "/revenue/analysis" });
    expect(response.statusCode).toBe(200);
    expect(revenueAnalysisResponseSchema.parse(response.json()).status).toBe("rejected");
  });
});

function fixtureContext(
  classifyNotes: AppContext["classifyNotes"],
  analyzeRevenue?: AppContext["analyzeRevenue"],
): AppContext {
  const context = createAppContext();
  const rejected: RevenueAnalysis = { status: "rejected", text: "" };
  return {
    ...context,
    loadSnapshot: async () => snapshot,
    modelName: "test-model",
    noteRecords: emptyNoteStore(),
    analysisRecords: emptyAnalysisStore(),
    classifyNotes: classifyNotes as (notes: Parameters<AppContext["classifyNotes"]>[0]) => Promise<NoteClassification>,
    analyzeRevenue: analyzeRevenue ?? (async () => rejected),
  };
}

function emptyNoteStore(): NoteRecordStore {
  return {
    async read(): Promise<StoredNote[]> {
      return [];
    },
    async save(): Promise<void> {
      return undefined;
    },
  };
}

function emptyAnalysisStore(): AnalysisRecordStore {
  return {
    async read(): Promise<StoredAnalysis | null> {
      return null;
    },
    async save(): Promise<void> {
      return undefined;
    },
  };
}
