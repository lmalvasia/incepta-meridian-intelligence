import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { defaultSourceDirectory } from "./repo.js";
import { formatImportReport, listSourceFiles } from "./source-files.js";

describe("listSourceFiles", () => {
  let directory: string | undefined;

  afterEach(async () => {
    if (directory !== undefined) {
      await rm(directory, { recursive: true, force: true });
      directory = undefined;
    }
  });

  it("returns no files when the directory is missing", async () => {
    const files = await listSourceFiles(path.join(tmpdir(), "meridian-missing-raw"));
    expect(files).toEqual([]);
  });

  it("lists csv files and ignores other files", async () => {
    directory = await mkdtemp(path.join(tmpdir(), "meridian-raw-"));
    await writeFile(path.join(directory, "b-invoices.csv"), "id\n");
    await writeFile(path.join(directory, "a-customers.csv"), "id\n");
    await writeFile(path.join(directory, "notes.txt"), "hello");

    await expect(listSourceFiles(directory)).resolves.toEqual([
      { name: "a-customers.csv", sizeBytes: 3 },
      { name: "b-invoices.csv", sizeBytes: 3 },
    ]);
  });
});

describe("formatImportReport", () => {
  it("says when no client exports are present", () => {
    expect(formatImportReport([])).toBe("No client exports in data/raw.");
  });

  it("names files without parsing columns", () => {
    expect(formatImportReport([{ name: "customers.csv", sizeBytes: 12 }])).toBe(
      [
        "Found 1 client export:",
        "- customers.csv (12 bytes)",
        "Column parsing is not implemented until a schema is derived from these files.",
      ].join("\n"),
    );
  });
});

describe("defaultSourceDirectory", () => {
  it("points at data/raw in this repository", () => {
    expect(defaultSourceDirectory().endsWith(`${path.sep}data${path.sep}raw`)).toBe(true);
  });
});
