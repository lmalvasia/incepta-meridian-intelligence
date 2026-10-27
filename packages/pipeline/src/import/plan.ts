import { readFile } from "node:fs/promises";
import { classifyContracts } from "../contracts/classify.js";
import { classifyCustomers } from "../customers/classify.js";
import { classifyNetSuite } from "../invoices/netsuite.js";
import { classifyQuickBooks } from "../invoices/quickbooks.js";
import { classifyNotes } from "../notes/classify.js";
import { discoverSourceFiles } from "../sources/discover.js";
import type { ImportPlan, SourceText } from "./types.js";

export function buildImportPlan(inputs: readonly SourceText[]): ImportPlan {
  const byName = new Map(inputs.map((input) => [input.fileName, input]));
  const take = (fileName: string): SourceText => {
    const input = byName.get(fileName);
    if (input === undefined) {
      throw new Error(`Missing parsed input for ${fileName}.`);
    }
    return input;
  };

  const customers = classifyCustomers(take("crm_customers.csv"));
  return {
    files: [
      customers.file,
      classifyContracts(take("contracts.csv"), customers.parties),
      classifyNetSuite(take("invoices_2025_2026_netsuite.csv"), customers.parties),
      classifyQuickBooks(take("invoices_2024_quickbooks.csv"), customers.parties),
      classifyNotes(take("account_notes.csv"), customers.parties),
    ],
  };
}

export async function loadImportPlan(
  directory: string,
): Promise<{ plan: ImportPlan; ignoredCsv: string[] }> {
  const discovered = await discoverSourceFiles(directory);
  const inputs: SourceText[] = [];
  for (const file of discovered.files) {
    inputs.push({
      fileName: file.fileName,
      sourceSystem: file.sourceSystem,
      byteSize: file.byteSize,
      text: await readFile(file.path, "utf8"),
    });
  }
  return { plan: buildImportPlan(inputs), ignoredCsv: discovered.ignoredCsv };
}
