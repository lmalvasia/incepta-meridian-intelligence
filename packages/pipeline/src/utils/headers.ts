export class HeaderMismatchError extends Error {
  readonly fileName: string;
  readonly missing: string[];
  readonly unexpected: string[];
  readonly duplicates: string[];

  constructor(fileName: string, missing: string[], unexpected: string[], duplicates: string[]) {
    const lines = [`Unexpected columns in ${fileName}.`];
    if (missing.length > 0) {
      lines.push(`Missing: ${missing.join(", ")}`);
    }
    if (unexpected.length > 0) {
      lines.push(`Unexpected: ${unexpected.join(", ")}`);
    }
    if (duplicates.length > 0) {
      lines.push(`Duplicate: ${duplicates.join(", ")}`);
    }
    super(lines.join("\n"));
    this.name = "HeaderMismatchError";
    this.fileName = fileName;
    this.missing = missing;
    this.unexpected = unexpected;
    this.duplicates = duplicates;
  }
}

export const FILE_HEADERS = {
  "crm_customers.csv": [
    "customer_id",
    "company_name",
    "industry",
    "city",
    "state",
    "account_manager",
    "created_date",
    "status",
  ],
  "invoices_2024_quickbooks.csv": ["Invoice No", "Customer", "Invoice Date", "Amount", "Status", "Memo"],
  "invoices_2025_2026_netsuite.csv": [
    "invoice_id",
    "customer_ref",
    "txn_date",
    "amount_usd",
    "currency",
    "status",
    "service_line",
  ],
  "contracts.csv": [
    "contract_id",
    "customer_id",
    "start_date",
    "end_date",
    "annual_value",
    "billing_frequency",
    "auto_renew",
    "service_tier",
  ],
  "account_notes.csv": ["note_id", "customer_name", "note_date", "author", "note_text"],
} as const;

export type SourceFileName = keyof typeof FILE_HEADERS;

export function headerProblems(
  fileName: SourceFileName,
  actual: readonly string[],
): { missing: string[]; unexpected: string[]; duplicates: string[] } {
  const expected = FILE_HEADERS[fileName];
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const header of actual) {
    if (seen.has(header)) {
      if (!duplicates.includes(header)) {
        duplicates.push(header);
      }
    }
    seen.add(header);
  }

  const expectedSet = new Set<string>(expected);
  const missing = expected.filter((header) => !seen.has(header));
  const unexpected = actual.filter((header) => !expectedSet.has(header));
  return { missing, unexpected, duplicates };
}

export function assertHeaders(fileName: SourceFileName, actual: readonly string[]): void {
  const problems = headerProblems(fileName, actual);
  if (problems.missing.length > 0 || problems.unexpected.length > 0 || problems.duplicates.length > 0) {
    throw new HeaderMismatchError(fileName, problems.missing, problems.unexpected, problems.duplicates);
  }
}
