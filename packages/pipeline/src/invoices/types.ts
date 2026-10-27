import type { LinkDecision } from "../customers/types.js";
import type { IssueDraft } from "../utils/issues.js";

export type InvoiceDraft = {
  billingSystem: "quickbooks" | "netsuite";
  sourceInvoiceId: string;
  invoiceDate: string;
  status: string;
  customerRef: string;
  amount: string;
  currency: string | null;
  memo: string | null;
  serviceLine: string | null;
  link: LinkDecision;
  issues: IssueDraft[];
};
