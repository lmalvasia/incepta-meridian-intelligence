import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { SourceSystemName } from "./types.js";

// README_from_client.txt: HubSpot customers and CRM contracts, the QuickBooks
// FY2024 register, the NetSuite register from January 2025 through June 2026,
// and account-manager notes. contracts.csv uses source system crm.
export const REQUIRED_SOURCES = [
  { fileName: "crm_customers.csv", sourceSystem: "crm" },
  { fileName: "contracts.csv", sourceSystem: "crm" },
  { fileName: "invoices_2025_2026_netsuite.csv", sourceSystem: "netsuite" },
  { fileName: "invoices_2024_quickbooks.csv", sourceSystem: "quickbooks" },
  { fileName: "account_notes.csv", sourceSystem: "account_notes" },
] as const satisfies ReadonlyArray<{ fileName: string; sourceSystem: SourceSystemName }>;

export type RequiredFileName = (typeof REQUIRED_SOURCES)[number]["fileName"];

export type DiscoveredFile = {
  fileName: RequiredFileName;
  sourceSystem: SourceSystemName;
  path: string;
  byteSize: number;
};

export class MissingSourceFilesError extends Error {
  readonly directory: string;
  readonly missing: string[];

  constructor(directory: string, missing: string[]) {
    super(`Missing required source files in ${directory}:\n${missing.map((name) => `- ${name}`).join("\n")}`);
    this.name = "MissingSourceFilesError";
    this.directory = directory;
    this.missing = missing;
  }
}

function isMissingDirectory(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export async function discoverSourceFiles(
  directory: string,
): Promise<{ files: DiscoveredFile[]; ignoredCsv: string[] }> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (isMissingDirectory(error)) {
      throw new MissingSourceFilesError(
        directory,
        REQUIRED_SOURCES.map((source) => source.fileName),
      );
    }
    throw error;
  }

  const present = new Set(
    entries.filter((entry) => entry.isFile()).map((entry) => entry.name),
  );
  const missing = REQUIRED_SOURCES.filter((source) => !present.has(source.fileName)).map(
    (source) => source.fileName,
  );
  if (missing.length > 0) {
    throw new MissingSourceFilesError(directory, missing);
  }

  const requiredNames = new Set<string>(REQUIRED_SOURCES.map((source) => source.fileName));
  const ignoredCsv = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".csv") && !requiredNames.has(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const files: DiscoveredFile[] = [];
  for (const source of REQUIRED_SOURCES) {
    const filePath = path.join(directory, source.fileName);
    const info = await stat(filePath);
    files.push({
      fileName: source.fileName,
      sourceSystem: source.sourceSystem,
      path: filePath,
      byteSize: info.size,
    });
  }

  return { files, ignoredCsv };
}
