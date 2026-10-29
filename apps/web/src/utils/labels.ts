import type { AccountResponse, QualityResponse } from "../types/dashboard";

export function categoryLabel(category: AccountResponse["category"]): string {
  const labels: Record<AccountResponse["category"], string> = {
    prospect: "Prospect",
    competitor: "Competitor",
    non_renewal: "Non-renewal",
    service: "Service",
    billing: "Billing",
    price: "Price",
    positive: "Positive",
    routine: "Routine",
    unlabeled: "Unlabeled",
    no_notes: "No notes",
  };
  return labels[category];
}

export function issueKindLabel(kind: QualityResponse["moving"][number]["kind"]): string {
  const labels: Record<QualityResponse["moving"][number]["kind"], string> = {
    repeated_name: "Repeated name",
    no_customer: "No customer",
    broken_contract: "Broken contract",
  };
  return labels[kind];
}
