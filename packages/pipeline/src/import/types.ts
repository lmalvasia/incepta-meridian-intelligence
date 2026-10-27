import type { Prisma } from "@meridian/db";
import type { ContractDraft } from "../contracts/types.js";
import type { CustomerDraft } from "../customers/types.js";
import type { InvoiceDraft } from "../invoices/types.js";
import type { NoteDraft } from "../notes/types.js";
import type { SourceSystemName } from "../sources/types.js";
import type { IssueDraft } from "../utils/issues.js";

export type { IssueDraft, SourceSystemName };

export type Tx = Prisma.TransactionClient;

/** A row that was read and not stored. Kept on the plan so the command can count it. */
export type SkippedRow = {
  key: string;
  issues: IssueDraft[];
};

export type FilePlan = {
  fileName: string;
  sourceSystem: SourceSystemName;
  byteSize: number;
  readCount: number;
  skippedCount: number;
  flaggedCount: number;
  collapsedCopies: number;
  collapsedCents: bigint;
  collapsedAmountsIncomplete: boolean;
  customers: CustomerDraft[];
  invoices: InvoiceDraft[];
  contracts: ContractDraft[];
  notes: NoteDraft[];
  skipped: SkippedRow[];
};

export type ImportPlan = {
  files: FilePlan[];
};

export type SourceText = {
  fileName: string;
  sourceSystem: SourceSystemName;
  byteSize: number;
  text: string;
};
