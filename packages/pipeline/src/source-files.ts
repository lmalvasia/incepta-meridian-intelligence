import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export type SourceFile = {
  name: string;
  sizeBytes: number;
};

function isMissingDirectory(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export async function listSourceFiles(directory: string): Promise<SourceFile[]> {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (isMissingDirectory(error)) {
      return [];
    }

    throw error;
  }

  const files: SourceFile[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".csv")) {
      continue;
    }

    const info = await stat(path.join(directory, entry.name));
    files.push({ name: entry.name, sizeBytes: info.size });
  }

  files.sort((left, right) => left.name.localeCompare(right.name));
  return files;
}

export function formatImportReport(files: readonly SourceFile[]): string {
  if (files.length === 0) {
    return "No client exports in data/raw.";
  }

  const label = files.length === 1 ? "client export" : "client exports";
  const lines = files.map((file) => `- ${file.name} (${file.sizeBytes} bytes)`);

  return [
    `Found ${files.length} ${label}:`,
    ...lines,
    "Column parsing is not implemented until a schema is derived from these files.",
  ].join("\n");
}
