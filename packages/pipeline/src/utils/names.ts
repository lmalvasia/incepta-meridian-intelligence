/**
 * Trim, case-fold, treat `&` as `and`, drop punctuation, and collapse spaces.
 * This is a comparison key. It is not a stored customer name.
 */
export function normalizeName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type NameRelation = "exact" | "prefix" | "none";

/** Token-boundary prefix in either direction. An equal name is `exact`, not `prefix`. */
export function nameRelation(left: string, right: string): NameRelation {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (a.length === 0 || b.length === 0) {
    return "none";
  }
  if (a === b) {
    return "exact";
  }
  if (a.startsWith(`${b} `) || b.startsWith(`${a} `)) {
    return "prefix";
  }
  return "none";
}

/** True when the names match except a trailing `group` / `grp` token. */
export function groupAbbreviationPair(left: string, right: string): boolean {
  const a = normalizeName(left).split(" ");
  const b = normalizeName(right).split(" ");
  if (a.length < 2 || a.length !== b.length) {
    return false;
  }

  for (let index = 0; index < a.length - 1; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }

  const lastTokens = new Set([a[a.length - 1], b[b.length - 1]]);
  return lastTokens.has("group") && lastTokens.has("grp");
}
