import type { LinkDecision } from "../customers/types.js";
import type { IssueDraft } from "../utils/issues.js";

export type NoteDraft = {
  sourceNoteId: string;
  customerName: string;
  noteDate: string;
  author: string;
  noteText: string;
  link: LinkDecision;
  issues: IssueDraft[];
};
