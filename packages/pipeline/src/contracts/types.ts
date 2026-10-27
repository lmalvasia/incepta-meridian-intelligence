import type { LinkDecision } from "../customers/types.js";
import type { IssueDraft } from "../utils/issues.js";

export type ContractDraft = {
  sourceContractId: string;
  customerRef: string;
  startDate: string;
  endDate: string;
  annualValue: string | null;
  billingFrequency: string;
  autoRenew: string | null;
  serviceTier: string;
  link: LinkDecision;
  issues: IssueDraft[];
};
