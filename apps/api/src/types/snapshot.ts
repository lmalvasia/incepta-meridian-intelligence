import type {
  CollapsedCopy,
  ContractInput,
  CustomerInput,
  InvoiceInput,
  IssueInput,
  NoteInput,
} from "@meridian/domain";

export type Snapshot = {
  customers: CustomerInput[];
  invoices: InvoiceInput[];
  notes: NoteInput[];
  contracts: ContractInput[];
  issues: IssueInput[];
  collapsedCopies: CollapsedCopy[];
};
