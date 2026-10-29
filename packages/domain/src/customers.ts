import { billedInvoices, inRange } from "./billed.js";
import { sourceIdsIn } from "./ids.js";
import { addAmounts } from "./money.js";
import { h1Current, h1Prior } from "./periods.js";
import { higherCategory, isModelCategory, watchCategories } from "./phrases.js";
import type {
  ClassifiedNote,
  ContractInput,
  CustomerInput,
  InvoiceInput,
  NoteCategoryName,
  NoteInput,
} from "./types.js";

export type ReviewReason = "contract_ended" | "inactive" | "note" | "no_customer";

export type AccountRow = {
  sourceId: string;
  displayName: string;
  accountManager: string | null;
  accountStatus: string | null;
  category: NoteCategoryName;
  categorySource: "model" | "none";
  reviewReasons: ReviewReason[];
  reading: string;
  quote: string;
  noteId: string | null;
  priorBilled: string;
  currentBilled: string;
  disputed: string;
  repeatedName: string | null;
  brokenContract: boolean;
  noCrmName: boolean;
  onWatchList: boolean;
};

export function buildAccounts(input: {
  customers: readonly CustomerInput[];
  invoices: readonly InvoiceInput[];
  notes: readonly NoteInput[];
  contracts: readonly ContractInput[];
  modelNotes: readonly ClassifiedNote[] | null;
}): AccountRow[] {
  const byId = new Map(input.customers.map((customer) => [customer.sourceId, customer]));
  const readings = readingsByCustomer(input.notes, input.modelNotes);
  const rows = input.customers.map((customer) =>
    accountRow(customer, input.invoices, input.contracts, readings.get(customer.sourceId), byId),
  );
  rows.push(...unnamedRows(input.invoices, byId));
  return rows.sort((left, right) => left.sourceId.localeCompare(right.sourceId));
}

function accountRow(
  customer: CustomerInput,
  invoices: readonly InvoiceInput[],
  contracts: readonly ContractInput[],
  reading: Reading | undefined,
  byId: ReadonlyMap<string, CustomerInput>,
): AccountRow {
  const own = billedInvoices(invoices).filter((invoice) => invoice.customerSourceId === customer.sourceId);
  const disputed = disputedInvoices(invoices, customer.sourceId);
  const broken = brokenContract(contracts, customer.sourceId);
  const ending = contractEnding(contracts, customer.sourceId);
  const category = reading?.category ?? "no_notes";
  const fromModel = reading?.fromModel === true;
  const reviewReasons: ReviewReason[] = [];
  if (isInactive(customer.accountStatus)) {
    reviewReasons.push("inactive");
  }
  if (ending) {
    reviewReasons.push("contract_ended");
  }
  if (fromModel && watchCategories.has(category)) {
    reviewReasons.push("note");
  }
  return {
    sourceId: customer.sourceId,
    displayName: customer.displayName,
    accountManager: customer.accountManager,
    accountStatus: customer.accountStatus,
    category,
    categorySource: fromModel ? "model" : "none",
    reviewReasons,
    reading: reading?.line ?? "",
    quote: reading?.quote ?? "",
    noteId: reading?.noteId ?? null,
    priorBilled: sumInPeriod(own, h1Prior.from, h1Prior.to),
    currentBilled: sumInPeriod(own, h1Current.from, h1Current.to),
    disputed: addAmounts(disputed.map((invoice) => invoice.amount)),
    repeatedName: repeatedLabel(disputed, byId),
    brokenContract: broken,
    noCrmName: false,
    onWatchList: reviewReasons.length > 0 || broken,
  };
}

function unnamedRows(invoices: readonly InvoiceInput[], known: ReadonlyMap<string, CustomerInput>): AccountRow[] {
  const ids = [
    ...new Set(
      billedInvoices(invoices)
        .filter((invoice) => invoice.linkStatus === "unmatched" && /^C-\d{4}$/.test(invoice.customerRef))
        .map((invoice) => invoice.customerRef),
    ),
  ];
  return ids
    .filter((id) => !known.has(id))
    .sort((left, right) => left.localeCompare(right))
    .map((sourceId) => {
      const own = billedInvoices(invoices).filter((invoice) => invoice.customerRef === sourceId);
      return {
        sourceId,
        displayName: "",
        accountManager: null,
        accountStatus: null,
        category: "no_notes" as const,
        categorySource: "none" as const,
        reviewReasons: ["no_customer" as const],
        reading: "",
        quote: "",
        noteId: null,
        priorBilled: sumInPeriod(own, h1Prior.from, h1Prior.to),
        currentBilled: sumInPeriod(own, h1Current.from, h1Current.to),
        disputed: "0.00",
        repeatedName: null,
        brokenContract: false,
        noCrmName: true,
        onWatchList: true,
      };
    });
}

type Reading = {
  category: NoteCategoryName;
  fromModel: boolean;
  line: string;
  quote: string;
  noteId: string;
};

function readingsByCustomer(
  notes: readonly NoteInput[],
  modelNotes: readonly ClassifiedNote[] | null,
): Map<string, Reading> {
  const model = new Map((modelNotes ?? []).map((note) => [note.noteId, note]));
  const grouped = new Map<string, Reading>();
  for (const note of notes) {
    if (note.linkStatus !== "linked" || note.customerSourceId === null) {
      continue;
    }
    const fromModel = model.get(note.sourceNoteId);
    const accepted = fromModel !== undefined && isModelCategory(fromModel.category);
    const next: Reading = {
      category: accepted && fromModel !== undefined ? fromModel.category : "unlabeled",
      fromModel: accepted,
      line: accepted && fromModel !== undefined ? fromModel.line : "",
      quote: note.noteText,
      noteId: note.sourceNoteId,
    };
    const current = grouped.get(note.customerSourceId);
    if (current === undefined || prefers(next, current)) {
      grouped.set(note.customerSourceId, next);
    }
  }
  return grouped;
}

function prefers(next: Reading, current: Reading): boolean {
  if (next.fromModel !== current.fromModel) {
    return next.fromModel;
  }
  if (next.category !== current.category) {
    return higherCategory(next.category, current.category) === next.category;
  }
  return next.noteId < current.noteId;
}

function disputedInvoices(invoices: readonly InvoiceInput[], sourceId: string): InvoiceInput[] {
  return billedInvoices(invoices).filter(
    (invoice) => invoice.linkStatus === "held" && sourceIdsIn(invoice.linkReason).includes(sourceId),
  );
}

function repeatedLabel(invoices: readonly InvoiceInput[], byId: ReadonlyMap<string, CustomerInput>): string | null {
  const ids = [...new Set(invoices.flatMap((invoice) => sourceIdsIn(invoice.linkReason)))].sort((left, right) =>
    left.localeCompare(right),
  );
  if (ids.length < 2) {
    return null;
  }
  return ids
    .map((id) => {
      const manager = byId.get(id)?.accountManager;
      return manager === null || manager === undefined || manager.length === 0 ? id : `${id} ${manager}`;
    })
    .join(" and ");
}

function sumInPeriod(invoices: readonly InvoiceInput[], from: string, to: string): string {
  return addAmounts(
    invoices.filter((invoice) => inRange(invoice.invoiceDate, from, to)).map((invoice) => invoice.amount),
  );
}

function brokenContract(contracts: readonly ContractInput[], sourceId: string): boolean {
  return contracts.some(
    (contract) => contract.customerSourceId === sourceId && contract.endDate < contract.startDate,
  );
}

function contractEnding(contracts: readonly ContractInput[], sourceId: string): boolean {
  return contracts.some(
    (contract) =>
      contract.customerSourceId === sourceId &&
      contract.endDate >= contract.startDate &&
      contract.endDate <= "2026-06-30",
  );
}

function isInactive(status: string | null): boolean {
  const value = status?.trim().toLowerCase();
  return value === "inactive" || value === "churned";
}
