import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MissingSourceFilesError, discoverSourceFiles } from "../../sources/discover.js";

describe("discoverSourceFiles", () => {
  let directory: string | undefined;

  afterEach(async () => {
    if (directory !== undefined) {
      await rm(directory, { recursive: true, force: true });
      directory = undefined;
    }
  });

  it("names every missing required file", async () => {
    directory = await mkdtemp(path.join(tmpdir(), "meridian-missing-"));
    await writeFile(path.join(directory, "crm_customers.csv"), "id\n");

    await expect(discoverSourceFiles(directory)).rejects.toThrow(MissingSourceFilesError);
    await expect(discoverSourceFiles(directory)).rejects.toThrow("contracts.csv");
    await expect(discoverSourceFiles(directory)).rejects.toThrow("account_notes.csv");
  });

  it("fails when the directory does not exist", async () => {
    const missing = path.join(tmpdir(), "meridian-raw-does-not-exist");
    await expect(discoverSourceFiles(missing)).rejects.toThrow(MissingSourceFilesError);
  });

  it("returns the five files in write order and lists unexpected csv files", async () => {
    directory = await mkdtemp(path.join(tmpdir(), "meridian-raw-"));
    const names = [
      "crm_customers.csv",
      "contracts.csv",
      "invoices_2025_2026_netsuite.csv",
      "invoices_2024_quickbooks.csv",
      "account_notes.csv",
    ];
    for (const name of names) {
      await writeFile(path.join(directory, name), "h\n");
    }
    await writeFile(path.join(directory, "extra.csv"), "h\n");
    await writeFile(path.join(directory, "README_from_client.txt"), "note\n");

    const discovered = await discoverSourceFiles(directory);
    expect(discovered.files.map((file) => file.fileName)).toEqual(names);
    expect(discovered.files.map((file) => file.sourceSystem)).toEqual([
      "crm",
      "crm",
      "netsuite",
      "quickbooks",
      "account_notes",
    ]);
    expect(discovered.ignoredCsv).toEqual(["extra.csv"]);
  });
});
