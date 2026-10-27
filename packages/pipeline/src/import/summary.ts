import type { LinkStatusName } from "../customers/types.js";
import type { ImportPlan } from "./types.js";
import { IssueCode } from "../utils/issues.js";
import { formatDecimal, parseMoney } from "../utils/money.js";

export type FileSummary = {
  fileName: string;
  sourceSystem: string;
  byteSize: number;
  readCount: number;
  skippedCount: number;
  flaggedCount: number;
  writtenCount: number;
};

export type LinkSlice = {
  identities: number;
  dollars: string;
};

export type LinkSystem = {
  source: string;
  linked: LinkSlice;
  held: LinkSlice;
  unmatched: LinkSlice;
};

export type LinkReport = {
  linked: LinkSlice;
  held: LinkSlice;
  unmatched: LinkSlice;
  crmNearDuplicates: number;
  systems: LinkSystem[];
};

export type ImportSummary = {
  files: FileSummary[];
  ignoredCsv: string[];
  collapsedCopies: number;
  collapsedDecimal: string;
  collapsedAmountsIncomplete: boolean;
  issuesObserved: number;
  links: LinkReport;
  totalNotice: string | null;
};

export function summarizePlan(plan: ImportPlan, ignoredCsv: readonly string[]): ImportSummary {
  let collapsedCents = 0n;
  let collapsedCopies = 0;
  let collapsedAmountsIncomplete = false;
  let issuesObserved = 0;
  let totalNotice: string | null = null;

  const files = plan.files.map((file) => {
    collapsedCents += file.collapsedCents;
    collapsedCopies += file.collapsedCopies;
    collapsedAmountsIncomplete ||= file.collapsedAmountsIncomplete;
    issuesObserved += [...file.customers, ...file.invoices, ...file.contracts, ...file.notes].reduce(
      (total, row) => total + row.issues.length,
      0,
    );
    const total = file.skipped.find((row) => row.key === "TOTAL");
    const notice = total?.issues.find((issue) => issue.code === IssueCode.reconciliationTotal);
    if (notice !== undefined) {
      totalNotice = notice.description;
    }
    return {
      fileName: file.fileName,
      sourceSystem: file.sourceSystem,
      byteSize: file.byteSize,
      readCount: file.readCount,
      skippedCount: file.skippedCount,
      flaggedCount: file.flaggedCount,
      writtenCount: file.customers.length + file.invoices.length + file.contracts.length + file.notes.length,
    };
  });

  return {
    files,
    ignoredCsv: [...ignoredCsv],
    collapsedCopies,
    collapsedDecimal: formatDecimal(collapsedCents),
    collapsedAmountsIncomplete,
    issuesObserved,
    links: summarizeLinks(plan),
    totalNotice,
  };
}

function emptySlice(): { identities: number; cents: bigint } {
  return { identities: 0, cents: 0n };
}

function addSlice(
  slice: { identities: number; cents: bigint },
  identities: number,
  cents: bigint,
): void {
  slice.identities += identities;
  slice.cents += cents;
}

function publish(slice: { identities: number; cents: bigint }): LinkSlice {
  return { identities: slice.identities, dollars: formatDecimal(slice.cents) };
}

/**
 * One identity is one exported customer ref or exact name in a file.
 * Dollars are invoice amounts. Contracts and notes add identities and no invoice dollars.
 */
export function summarizeLinks(plan: ImportPlan): LinkReport {
  const totals = {
    linked: emptySlice(),
    held: emptySlice(),
    unmatched: emptySlice(),
  };
  let crmNearDuplicates = 0;
  const systems: LinkSystem[] = [];

  for (const file of plan.files) {
    if (file.fileName === "crm_customers.csv") {
      crmNearDuplicates += file.customers.filter((customer) =>
        customer.issues.some((issue) => issue.code === IssueCode.possibleDuplicateCustomer),
      ).length;
      continue;
    }

    const buckets = {
      linked: emptySlice(),
      held: emptySlice(),
      unmatched: emptySlice(),
    };
    const parties = new Map<string, { status: LinkStatusName; cents: bigint }>();

    for (const invoice of file.invoices) {
      const money = parseMoney(invoice.amount);
      const cents = money.kind === "amount" ? money.cents : 0n;
      const found = parties.get(invoice.customerRef);
      if (found === undefined) {
        parties.set(invoice.customerRef, { status: invoice.link.status, cents });
      } else {
        found.cents += cents;
      }
    }
    for (const contract of file.contracts) {
      if (!parties.has(contract.customerRef)) {
        parties.set(contract.customerRef, { status: contract.link.status, cents: 0n });
      }
    }
    for (const note of file.notes) {
      if (!parties.has(note.customerName)) {
        parties.set(note.customerName, { status: note.link.status, cents: 0n });
      }
    }

    for (const party of parties.values()) {
      addSlice(buckets[party.status], 1, party.cents);
    }
    addSlice(totals.linked, buckets.linked.identities, buckets.linked.cents);
    addSlice(totals.held, buckets.held.identities, buckets.held.cents);
    addSlice(totals.unmatched, buckets.unmatched.identities, buckets.unmatched.cents);
    systems.push({
      source: file.fileName,
      linked: publish(buckets.linked),
      held: publish(buckets.held),
      unmatched: publish(buckets.unmatched),
    });
  }

  return {
    linked: publish(totals.linked),
    held: publish(totals.held),
    unmatched: publish(totals.unmatched),
    crmNearDuplicates,
    systems,
  };
}

function sliceText(label: string, slice: LinkSlice): string {
  return `${label} ${slice.identities.toString()} identities, $${slice.dollars}`;
}

export function formatLinkReport(report: LinkReport): string {
  const lines = [
    "Customer links:",
    `  ${sliceText("linked:", report.linked)}`,
    `  ${sliceText("held:", report.held)}`,
    `  ${sliceText("unmatched:", report.unmatched)}`,
    `  CRM near-duplicates kept separate: ${report.crmNearDuplicates.toString()}`,
  ];
  for (const system of report.systems) {
    lines.push(
      `  ${system.source}: ${sliceText("linked", system.linked)}, ${sliceText("held", system.held)}, ${sliceText("unmatched", system.unmatched)}`,
    );
  }
  return lines.join("\n");
}

export function formatSummary(summary: ImportSummary): string {
  const lines = ["Import finished"];
  for (const file of summary.files) {
    lines.push(
      `${file.fileName} (${file.sourceSystem}, ${file.byteSize.toString()} bytes): read ${file.readCount.toString()}, skipped ${file.skippedCount.toString()}, flagged ${file.flaggedCount.toString()}, written ${file.writtenCount.toString()}`,
    );
  }

  const totals = summary.files.reduce(
    (total, file) => ({
      read: total.read + file.readCount,
      skipped: total.skipped + file.skippedCount,
      flagged: total.flagged + file.flaggedCount,
      written: total.written + file.writtenCount,
    }),
    { read: 0, skipped: 0, flagged: 0, written: 0 },
  );
  lines.push(
    `Totals: read ${totals.read.toString()}, skipped ${totals.skipped.toString()}, flagged ${totals.flagged.toString()}, written ${totals.written.toString()}`,
  );
  lines.push(`Identical copies collapsed: ${summary.collapsedCopies.toString()} (${summary.collapsedDecimal})`);
  if (summary.collapsedAmountsIncomplete) {
    lines.push("Some collapsed copies had no parseable amount, so that dollar figure is partial.");
  }
  if (summary.totalNotice !== null) {
    lines.push(summary.totalNotice);
  }
  lines.push(`Issues stored: ${summary.issuesObserved.toString()}`);
  if (summary.ignoredCsv.length > 0) {
    lines.push(`Ignored CSV files: ${summary.ignoredCsv.join(", ")}`);
  }
  lines.push("");
  lines.push(formatLinkReport(summary.links));
  return lines.join("\n");
}
