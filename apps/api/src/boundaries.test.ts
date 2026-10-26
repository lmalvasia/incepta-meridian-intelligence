import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function readPackage(relativePath: string): PackageJson {
  const file = path.join(repoRoot, relativePath, "package.json");
  return JSON.parse(readFileSync(file, "utf8")) as PackageJson;
}

function dependencyNames(pkg: PackageJson): string[] {
  return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).sort();
}

function workspaceNames(pkg: PackageJson): string[] {
  return dependencyNames(pkg).filter((name) => name.startsWith("@meridian/"));
}

describe("package boundaries", () => {
  it("keeps workspace dependencies one-directional", () => {
    expect(workspaceNames(readPackage("packages/contracts"))).toEqual([]);
    expect(workspaceNames(readPackage("packages/domain"))).toEqual([]);
    expect(workspaceNames(readPackage("packages/pipeline"))).toEqual([]);
    expect(workspaceNames(readPackage("packages/db"))).toEqual([]);
    expect(workspaceNames(readPackage("packages/ai"))).toEqual([]);
    expect(workspaceNames(readPackage("apps/web"))).toEqual(["@meridian/contracts"]);
    expect(workspaceNames(readPackage("apps/api"))).toEqual([
      "@meridian/ai",
      "@meridian/contracts",
      "@meridian/db",
      "@meridian/domain",
      "@meridian/pipeline",
    ]);
  });

  it("keeps the web app away from the database and ingestion packages", () => {
    const names = dependencyNames(readPackage("apps/web"));

    expect(names).not.toContain("@meridian/db");
    expect(names).not.toContain("@prisma/client");
    expect(names).not.toContain("@meridian/pipeline");
    expect(names).not.toContain("@meridian/domain");
    expect(names).not.toContain("@meridian/ai");
    expect(names).not.toContain("pg");
  });
});
