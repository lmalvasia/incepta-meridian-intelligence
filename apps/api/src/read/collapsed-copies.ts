import { defaultSourceDirectory, loadImportPlan } from "@meridian/pipeline";
import type { CollapsedCopy } from "@meridian/domain";

const invoiceFiles = new Set(["invoices_2024_quickbooks.csv", "invoices_2025_2026_netsuite.csv"]);

export async function collapsedCopies(): Promise<CollapsedCopy[]> {
  const { plan } = await loadImportPlan(defaultSourceDirectory());
  return plan.files.flatMap((file) => {
    if (!invoiceFiles.has(file.fileName) || file.collapsedCents === 0n) {
      return [];
    }
    return [{ count: file.collapsedCopies, amount: formatCents(file.collapsedCents), invoiceDate: "2026-04-01" }];
  });
}

function formatCents(cents: bigint): string {
  const whole = cents / 100n;
  const fraction = (cents % 100n).toString().padStart(2, "0");
  return `${whole.toString()}.${fraction}`;
}
