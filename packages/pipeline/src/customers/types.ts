import type { IssueDraft } from "../utils/issues.js";

export type LinkStatusName = "linked" | "held" | "unmatched";

export type LinkDecision = {
  status: LinkStatusName;
  customerSourceId: string | null;
  reason: string;
};

export type CustomerDraft = {
  sourceId: string;
  displayName: string;
  industry: string | null;
  city: string | null;
  state: string | null;
  accountManager: string | null;
  accountStatus: string | null;
  createdOn: string | null;
  issues: IssueDraft[];
};

export type CrmParty = {
  sourceId: string;
  displayName: string;
  normalized: string;
};
