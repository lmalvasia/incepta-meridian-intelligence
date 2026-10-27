import type { PrismaClient } from "@meridian/db";
import { writeContracts } from "../contracts/write.js";
import { writeCustomers } from "../customers/write.js";
import { writeInvoices } from "../invoices/write.js";
import { writeNotes } from "../notes/write.js";
import { loadImportPlan } from "./plan.js";
import { summarizePlan, type ImportSummary } from "./summary.js";

const TRANSACTION_TIMEOUT_MS = 600_000;

export async function importDirectory(db: PrismaClient, directory: string): Promise<ImportSummary> {
  const { plan, ignoredCsv } = await loadImportPlan(directory);
  await db.$transaction(
    async (tx) => {
      const customerIds = await writeCustomers(
        tx,
        plan.files.flatMap((file) => file.customers),
      );
      await writeInvoices(
        tx,
        plan.files.flatMap((file) => file.invoices),
        customerIds,
      );
      await writeContracts(
        tx,
        plan.files.flatMap((file) => file.contracts),
        customerIds,
      );
      await writeNotes(
        tx,
        plan.files.flatMap((file) => file.notes),
        customerIds,
      );
    },
    { timeout: TRANSACTION_TIMEOUT_MS, maxWait: 20_000 },
  );
  return summarizePlan(plan, ignoredCsv);
}
