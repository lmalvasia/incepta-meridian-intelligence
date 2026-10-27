import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { config } from "dotenv";
import { afterAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@meridian/db";
import { findRepoRoot } from "../../sources/repo.js";

config({ path: path.join(findRepoRoot(process.cwd()), ".env"), quiet: true });

const databaseUrl = process.env.DATABASE_URL;
const FIXTURE_CUSTOMERS = ["C-9001"];
const FIXTURE_INVOICES = ["INV-FIXTURE-1", "NS-INV-FIXTURE-1"];
const FIXTURE_CONTRACTS = ["CTR-FIXTURE-1"];
const FIXTURE_NOTES = ["N-FIXTURE-1"];

async function databaseReady(): Promise<boolean> {
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    return false;
  }
  try {
    const { createDb } = await import("@meridian/db");
    const db = createDb(databaseUrl);
    try {
      await db.$queryRaw`SELECT 1`;
      return true;
    } finally {
      await db.$disconnect();
    }
  } catch {
    return false;
  }
}

const ready = await databaseReady();

describe("importDirectory", () => {
  let directory: string | undefined;
  let imported = false;

  afterAll(async () => {
    if (directory !== undefined) {
      await rm(directory, { recursive: true, force: true });
    }
    if (!ready || !imported || databaseUrl === undefined) {
      return;
    }
    const { createDb } = await import("@meridian/db");
    const db = createDb(databaseUrl);
    try {
      await removeFixture(db);
    } finally {
      await db.$disconnect();
    }
  });

  it("loads a fixture twice without duplicating invoices or amounts", async ({ skip }) => {
    if (!ready || databaseUrl === undefined) {
      skip("PostgreSQL is not reachable, so the import was not executed.");
      return;
    }

    directory = await mkdtemp(path.join(tmpdir(), "meridian-import-"));
    await writeFixture(directory);

    const { createDb } = await import("@meridian/db");
    const { importDirectory } = await import("../../import/write.js");
    const db = createDb(databaseUrl);
    try {
      const first = await importDirectory(db, directory);
      imported = true;
      const second = await importDirectory(db, directory);

      expect(first.files.every((file) => file.writtenCount > 0 || file.fileName.length > 0)).toBe(true);
      expect(second.collapsedDecimal).toBe(first.collapsedDecimal);

      const quickbooks = await db.invoice.findMany({ where: { sourceInvoiceId: "INV-FIXTURE-1" } });
      const netsuite = await db.invoice.findMany({ where: { sourceInvoiceId: "NS-INV-FIXTURE-1" } });
      expect(quickbooks).toHaveLength(1);
      expect(netsuite).toHaveLength(1);
      expect(money(quickbooks[0]?.amount)).toBe("20.00");
      expect(money(netsuite[0]?.amount)).toBe("10.50");
      expect(quickbooks[0]?.linkStatus).toBe("linked");
      expect(netsuite[0]?.linkStatus).toBe("linked");
      expect(quickbooks[0]?.customerId).toBe(netsuite[0]?.customerId);

      const customers = await db.customer.findMany({ where: { sourceId: "C-9001" } });
      expect(customers).toHaveLength(1);
      expect(customers[0]?.displayName).toBe("Fixture Customer ZZZ");

      const notes = await db.accountNote.findMany({ where: { sourceNoteId: "N-FIXTURE-1" } });
      expect(notes).toHaveLength(1);
      expect(notes[0]?.linkStatus).toBe("linked");
      expect(notes[0]?.customerId).toBe(customers[0]?.id);
    } finally {
      await db.$disconnect();
    }
  });
});

function money(value: { toFixed: (digits: number) => string } | undefined): string {
  if (value === undefined) {
    throw new Error("Missing amount.");
  }
  return value.toFixed(2);
}

async function writeFixture(directory: string): Promise<void> {
  const files: Record<string, string> = {
    "crm_customers.csv": [
      "customer_id,company_name,industry,city,state,account_manager,created_date,status",
      "C-9001,Fixture Customer ZZZ,Retail,Test City,NY,S. Patel,2024-01-02,Active",
    ].join("\n"),
    "contracts.csv": [
      "contract_id,customer_id,start_date,end_date,annual_value,billing_frequency,auto_renew,service_tier",
      "CTR-FIXTURE-1,C-9001,2024-01-01,2025-01-01,1000.0,Monthly,Yes,Gold",
    ].join("\n"),
    "invoices_2025_2026_netsuite.csv": [
      "invoice_id,customer_ref,txn_date,amount_usd,currency,status,service_line",
      "NS-INV-FIXTURE-1,C-9001,2025-01-15,10.50,USD,open,Repair",
      "NS-INV-FIXTURE-1,C-9001,2025-01-15,10.50,USD,open,Repair",
    ].join("\n"),
    "invoices_2024_quickbooks.csv": [
      "Invoice No,Customer,Invoice Date,Amount,Status,Memo",
      'INV-FIXTURE-1,Fixture Customer ZZZ,01/15/2024,"$20.00",Paid,PM visit - monthly',
    ].join("\n"),
    "account_notes.csv": [
      "note_id,customer_name,note_date,author,note_text",
      "N-FIXTURE-1,Fixture Customer ZZZ,2024-06-10,S. Patel,Fixture note only.",
    ].join("\n"),
  };

  for (const [name, text] of Object.entries(files)) {
    await writeFile(path.join(directory, name), text);
  }
}

async function removeFixture(db: PrismaClient): Promise<void> {
  const customers = await db.customer.findMany({
    where: { sourceId: { in: FIXTURE_CUSTOMERS } },
    select: { id: true },
  });
  const customerIds = customers.map((row) => row.id);
  const invoices = await db.invoice.findMany({
    where: { sourceInvoiceId: { in: FIXTURE_INVOICES } },
    select: { id: true },
  });
  const contracts = await db.contract.findMany({
    where: { sourceContractId: { in: FIXTURE_CONTRACTS } },
    select: { id: true },
  });
  const notes = await db.accountNote.findMany({
    where: { sourceNoteId: { in: FIXTURE_NOTES } },
    select: { id: true },
  });
  await db.dataQualityIssue.deleteMany({
    where: {
      OR: [
        { customerId: { in: customerIds } },
        { invoiceId: { in: invoices.map((row) => row.id) } },
        { contractId: { in: contracts.map((row) => row.id) } },
        { noteId: { in: notes.map((row) => row.id) } },
      ],
    },
  });
  await db.accountNote.deleteMany({ where: { id: { in: notes.map((row) => row.id) } } });
  await db.invoice.deleteMany({ where: { id: { in: invoices.map((row) => row.id) } } });
  await db.contract.deleteMany({ where: { id: { in: contracts.map((row) => row.id) } } });
  await db.customer.deleteMany({ where: { id: { in: customerIds } } });
}
