export type LinkStatusName = "linked" | "held" | "unmatched";

export type BillingSystemName = "quickbooks" | "netsuite";

export type NoteCategoryName =
  | "prospect"
  | "competitor"
  | "non_renewal"
  | "service"
  | "billing"
  | "price"
  | "positive"
  | "routine"
  | "unlabeled"
  | "no_notes";

export type InvoiceInput = {
  sourceInvoiceId: string;
  billingSystem: BillingSystemName;
  invoiceDate: string;
  status: string;
  customerRef: string;
  amount: string;
  serviceLine: string | null;
  linkStatus: LinkStatusName;
  linkReason: string;
  customerSourceId: string | null;
};

export type NoteInput = {
  sourceNoteId: string;
  noteDate: string;
  noteText: string;
  linkStatus: LinkStatusName;
  customerSourceId: string | null;
};

export type ContractInput = {
  sourceContractId: string;
  customerRef: string;
  startDate: string;
  endDate: string;
  autoRenew: string | null;
  customerSourceId: string | null;
};

export type CustomerInput = {
  sourceId: string;
  displayName: string;
  accountManager: string | null;
  accountStatus: string | null;
};

export type IssueSeverityName = "info" | "warning" | "error";

export type IssueInput = {
  code: string;
  severity: IssueSeverityName;
  description: string;
  amountImpact: string | null;
  subject: string | null;
};

export type CollapsedCopy = {
  count: number;
  amount: string;
  invoiceDate: string;
};

export type ClassifiedNote = {
  noteId: string;
  category: NoteCategoryName;
  line: string;
};
