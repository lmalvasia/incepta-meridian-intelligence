import type { NoteCategoryName } from "./types.js";

const rules: ReadonlyArray<{ category: NoteCategoryName; pattern: RegExp }> = [
  { category: "prospect", pattern: /prospect meeting/i },
  { category: "competitor", pattern: /therma-serv|coolflow/i },
  { category: "non_renewal", pattern: /non-renewal|early termination/i },
  { category: "service", pattern: /repeat failures|6\+ hr|no-showed/i },
  { category: "billing", pattern: /duplicate charges|wrong po/i },
  { category: "price", pattern: /price increase/i },
  { category: "positive", pattern: /within spec|uptime|9\/10|budget approved/i },
  { category: "routine", pattern: /scope flat/i },
];

export const categoryRank: readonly NoteCategoryName[] = [
  "competitor",
  "non_renewal",
  "service",
  "billing",
  "price",
  "prospect",
  "positive",
  "routine",
  "unlabeled",
  "no_notes",
];

export const watchCategories = new Set<NoteCategoryName>([
  "competitor",
  "non_renewal",
  "service",
  "billing",
  "price",
]);

const accepted = new Set<NoteCategoryName>(categoryRank.filter((category) => category !== "no_notes" && category !== "unlabeled"));

export function isModelCategory(category: NoteCategoryName): boolean {
  return accepted.has(category);
}

export function phraseCategory(text: string): NoteCategoryName {
  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      return rule.category;
    }
  }
  return "unlabeled";
}

export function higherCategory(left: NoteCategoryName, right: NoteCategoryName): NoteCategoryName {
  return categoryRank.indexOf(left) <= categoryRank.indexOf(right) ? left : right;
}
