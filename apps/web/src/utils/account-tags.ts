import type { AccountResponse } from "../types/dashboard";
import { categoryLabel } from "./labels";

export type AccountTagId =
  | "contract_ended"
  | "inactive"
  | "no_crm"
  | "repeated_name"
  | "broken_contract"
  | AccountResponse["category"];

export type TagKind = "flag" | "note";

export type TagLevel = "high" | "review" | "context";

export type AccountTag = {
  id: AccountTagId;
  label: string;
  meaning: string;
  kind: TagKind;
  level: TagLevel;
};

const review = " This puts the account in To review.";
const shown = " It stays on the account and does not, by itself, put it in To review.";

const noteTags: Array<Pick<AccountTag, "id" | "meaning" | "level">> = [
  { id: "competitor", level: "high", meaning: "The model read a note about leaving for a competitor, such as Therma-Serv or CoolFlow." + review },
  { id: "non_renewal", level: "high", meaning: "The model read a note about not renewing or ending the contract early." + review },
  { id: "service", level: "review", meaning: "The model read a service complaint, such as repeat failures, a long wait, or a no-show." + review },
  { id: "billing", level: "review", meaning: "The model read a billing complaint, such as duplicate charges or a wrong PO." + review },
  { id: "price", level: "review", meaning: "The model read a note about a price increase." + review },
  { id: "prospect", level: "context", meaning: "The model read a prospect meeting." + shown },
  { id: "positive", level: "context", meaning: "The model read a positive note about the account." + shown },
  { id: "routine", level: "context", meaning: "The model read a routine check-in." + shown },
];

export const tagCatalog: AccountTag[] = [
  { id: "contract_ended", label: "Contract ended", kind: "flag", level: "review", meaning: "A contract that is not broken ends on or before June 30, 2026." + review },
  { id: "inactive", label: "Inactive", kind: "flag", level: "high", meaning: "The CRM status is Churned or Inactive." + review },
  { id: "no_crm", label: "No CRM name", kind: "flag", level: "review", meaning: "This customer id has billed invoices and no CRM name." + review },
  { id: "repeated_name", label: "Repeated name", kind: "flag", level: "context", meaning: "The same invoice name matches more than one CRM customer. The invoice is listed on both and counted once." + shown },
  { id: "broken_contract", label: "Broken contract", kind: "flag", level: "high", meaning: "The contract end date is before the start date. It is not counted as a contract that ended." + review },
  ...noteTags.map((tag) => ({ ...tag, kind: "note" as const, label: categoryLabel(tag.id as AccountResponse["category"]) })),
];

const byId = new Map(tagCatalog.map((tag) => [tag.id, tag]));

export function tagById(id: string | null): AccountTag | null {
  if (id === null) {
    return null;
  }
  return byId.get(id as AccountTagId) ?? null;
}

export function tagsForAccount(account: AccountResponse): AccountTag[] {
  const present = new Set<AccountTagId>();
  if (account.reviewReasons.includes("contract_ended")) {
    present.add("contract_ended");
  }
  if (account.reviewReasons.includes("inactive")) {
    present.add("inactive");
  }
  if (account.reviewReasons.includes("no_customer") || account.noCrmName) {
    present.add("no_crm");
  }
  if (account.repeatedName !== null) {
    present.add("repeated_name");
  }
  if (account.brokenContract) {
    present.add("broken_contract");
  }
  if (account.categorySource === "model") {
    present.add(account.category);
  }
  return tagCatalog.filter((tag) => present.has(tag.id));
}
