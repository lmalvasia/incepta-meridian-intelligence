import { parse } from "csv-parse/sync";

export type ParsedRow = {
  /** 1-based line number of the first physical line of this record. Line 1 is the header. */
  lineNumber: number;
  cells: string[];
};

export type ParsedTable = {
  headers: string[];
  rows: ParsedRow[];
};

type CsvRecord = {
  record: string[];
  raw: string;
};

/**
 * `csv-parse` reads the file. Cell text is kept as exported, including spaces.
 * The line number is the physical line where the record starts.
 */
export function parseCsv(text: string): ParsedTable {
  const records = parse(text, {
    bom: true,
    trim: false,
    relax_column_count: true,
    skip_empty_lines: false,
    info: true,
    raw: true,
  }) as unknown as CsvRecord[];

  if (records.length === 0) {
    throw new Error("CSV file is empty.");
  }

  const rows: ParsedRow[] = [];
  let lineNumber = 1;
  for (const entry of records) {
    rows.push({ lineNumber, cells: entry.record });
    lineNumber += lineBreaks(entry.raw);
  }

  const header = rows[0];
  if (header === undefined) {
    throw new Error("CSV file is empty.");
  }

  return {
    headers: header.cells,
    rows: rows.slice(1),
  };
}

function lineBreaks(raw: string): number {
  let count = 0;
  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];
    if (character === "\n" || (character === "\r" && raw[index + 1] !== "\n")) {
      count += 1;
    }
  }
  return count;
}

export function recordFrom(headers: readonly string[], cells: readonly string[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index];
    if (header === undefined) {
      continue;
    }
    record[header] = cells[index] ?? "";
  }
  return record;
}
