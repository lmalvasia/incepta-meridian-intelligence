import type { AccountRow } from "@meridian/domain";

export function signalLines(accounts: readonly AccountRow[]): string[] {
  const ended = accounts.filter((account) => account.reviewReasons.includes("contract_ended"));
  const endedStillBilling = ended.filter((account) => Number(account.currentBilled) > 0).length;
  return [
    "Counts already calculated. A contract end date is not proof the customer left.",
    `Accounts ${accounts.length.toString()}. To review ${accounts.filter((account) => account.onWatchList).length.toString()}.`,
    `Contract end date on or before June 30, 2026: ${ended.length.toString()}. Still billed in H1 2026: ${endedStillBilling.toString()}. No H1 2026 invoices: ${(ended.length - endedStillBilling).toString()}.`,
    `Inactive or churned in the CRM: ${countReason(accounts, "inactive").toString()}.`,
    `Broken contracts: ${accounts.filter((account) => account.brokenContract).length.toString()}.`,
    `Repeated names: ${accounts.filter((account) => account.repeatedName !== null).length.toString()}.`,
    `Note tags from the model: ${noteCounts(accounts)}.`,
  ];
}

function countReason(accounts: readonly AccountRow[], reason: AccountRow["reviewReasons"][number]): number {
  return accounts.filter((account) => account.reviewReasons.includes(reason)).length;
}

function noteCounts(accounts: readonly AccountRow[]): string {
  const labels = ["competitor", "non_renewal", "service", "billing", "price", "prospect", "positive", "routine"] as const;
  return labels
    .map((label) => `${label} ${accounts.filter((account) => account.categorySource === "model" && account.category === label).length.toString()}`)
    .join(", ");
}
