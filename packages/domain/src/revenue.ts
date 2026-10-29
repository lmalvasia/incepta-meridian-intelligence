import { billedInvoices, inRange, isVoid } from "./billed.js";
import { addAmounts } from "./money.js";
import { periods, throughDate, type Period } from "./periods.js";
import type { CollapsedCopy, InvoiceInput } from "./types.js";

export type MoneySplit = {
  assigned: string;
  disputed: string;
  noCustomer: string;
  excluded: string;
};

export type MonthTotal = {
  month: string;
  billed: string;
};

export type ServiceLineTotal = {
  name: string;
  billed: string;
};

export type PeriodRevenue = Period & {
  billed: string;
  split: MoneySplit;
  months: MonthTotal[];
  serviceLines: ServiceLineTotal[];
};

export type RevenueReport = {
  through: string;
  periods: PeriodRevenue[];
};

export function buildRevenue(
  invoices: readonly InvoiceInput[],
  collapsedCopies: readonly CollapsedCopy[],
): RevenueReport {
  return {
    through: throughDate,
    periods: periods.map((period) => periodRevenue(period, invoices, collapsedCopies)),
  };
}

function periodRevenue(
  period: Period,
  invoices: readonly InvoiceInput[],
  collapsedCopies: readonly CollapsedCopy[],
): PeriodRevenue {
  const inPeriod = invoices.filter((invoice) => inRange(invoice.invoiceDate, period.from, period.to));
  const billed = billedInvoices(inPeriod);
  const split = splitAmounts(billed, voidsAndCopies(inPeriod, collapsedCopies, period));
  return {
    ...period,
    billed: addAmounts(billed.map((invoice) => invoice.amount)),
    split,
    months: monthTotals(billed, period),
    serviceLines: serviceLineTotals(billed),
  };
}

function voidsAndCopies(
  invoices: readonly InvoiceInput[],
  collapsedCopies: readonly CollapsedCopy[],
  period: Period,
): string[] {
  const voids = invoices.filter((invoice) => isVoid(invoice.status)).map((invoice) => invoice.amount);
  const copies = collapsedCopies
    .filter((copy) => inRange(copy.invoiceDate, period.from, period.to))
    .map((copy) => copy.amount);
  return [...voids, ...copies];
}

function splitAmounts(billed: readonly InvoiceInput[], excluded: readonly string[]): MoneySplit {
  return {
    assigned: addAmounts(amountsFor(billed, "linked")),
    disputed: addAmounts(amountsFor(billed, "held")),
    noCustomer: addAmounts(amountsFor(billed, "unmatched")),
    excluded: addAmounts(excluded),
  };
}

function amountsFor(invoices: readonly InvoiceInput[], status: InvoiceInput["linkStatus"]): string[] {
  return invoices.filter((invoice) => invoice.linkStatus === status).map((invoice) => invoice.amount);
}

function monthTotals(billed: readonly InvoiceInput[], period: Period): MonthTotal[] {
  const months: MonthTotal[] = [];
  let cursor = period.from.slice(0, 7);
  const last = period.to.slice(0, 7);
  while (cursor <= last) {
    const inMonth = billed.filter((invoice) => invoice.invoiceDate.startsWith(cursor));
    months.push({ month: cursor, billed: addAmounts(inMonth.map((invoice) => invoice.amount)) });
    cursor = nextMonth(cursor);
  }
  return months;
}

function nextMonth(month: string): string {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const value = Number(monthText);
  if (value === 12) {
    return `${(year + 1).toString()}-01`;
  }
  return `${year.toString()}-${(value + 1).toString().padStart(2, "0")}`;
}

function serviceLineTotals(billed: readonly InvoiceInput[]): ServiceLineTotal[] {
  const netsuite = billed.filter((invoice) => invoice.billingSystem === "netsuite" && invoice.serviceLine !== null);
  const names = [...new Set(netsuite.map((invoice) => invoice.serviceLine ?? ""))].sort((left, right) =>
    left.localeCompare(right),
  );
  return names.map((name) => ({
    name,
    billed: addAmounts(
      netsuite.filter((invoice) => invoice.serviceLine === name).map((invoice) => invoice.amount),
    ),
  }));
}
