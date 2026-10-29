export const domain = {
  name: "meridian-domain",
} as const;

export { contractsForAccount } from "./account-contracts.js";
export type { AccountContract, ContractState } from "./account-contracts.js";
export { invoicesForAccount } from "./account-invoices.js";
export { buildAccounts } from "./customers.js";
export type { AccountRow, ReviewReason } from "./customers.js";
export { noteCoverage } from "./coverage.js";
export type { CoverageReport } from "./coverage.js";
export { phraseCategory } from "./phrases.js";
export { buildQuality } from "./quality.js";
export type { MovingIssue, QualityReport, StoredIssue } from "./quality.js";
export { buildRevenue } from "./revenue.js";
export type { MoneySplit, PeriodRevenue, RevenueReport } from "./revenue.js";
export type {
  BillingSystemName,
  ClassifiedNote,
  CollapsedCopy,
  ContractInput,
  CustomerInput,
  InvoiceInput,
  IssueInput,
  IssueSeverityName,
  LinkStatusName,
  NoteCategoryName,
  NoteInput,
} from "./types.js";
