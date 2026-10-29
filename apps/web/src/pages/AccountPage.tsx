import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { AccountContracts } from "../components/accounts/AccountContracts";
import { InvoiceTable } from "../components/accounts/InvoiceTable";
import { YearFilter } from "../components/accounts/YearFilter";
import { InfoTip } from "../components/InfoTip";
import { PageHeader } from "../components/PageHeader";
import { PageLink } from "../components/PageLink";
import { PageState } from "../components/PageState";
import { useAccountInvoices } from "../hooks/useAccountInvoices";
import type { AccountInvoicesResponse } from "../types/dashboard";
import { info } from "../utils/info";
import { formatMoney } from "../utils/money";

export function AccountPage() {
  const params = useParams();
  const sourceId = params.sourceId ?? "";
  const invoices = useAccountInvoices(sourceId);
  const [year, setYear] = useState("all");
  return (
    <>
      <PageLink to="/accounts">All accounts</PageLink>
      <PageState query={invoices}>
        {(data) => <AccountInvoices data={data} year={year} onYear={setYear} />}
      </PageState>
    </>
  );
}

type AccountInvoicesProps = {
  data: AccountInvoicesResponse;
  year: string;
  onYear: (year: string) => void;
};

function AccountInvoices({ data, year, onYear }: AccountInvoicesProps) {
  const years = useMemo(
    () => [...new Set(data.invoices.map((invoice) => invoice.invoiceDate.slice(0, 4)))].sort(),
    [data.invoices],
  );
  const visible = year === "all" ? data.invoices : data.invoices.filter((invoice) => invoice.invoiceDate.startsWith(year));
  const name = data.displayName.length === 0 ? "No CRM name" : data.displayName;
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <PageHeader title={name} description={`${data.sourceId}. ${visible.length.toString()} invoices, ${formatMoney(sum(visible))}.`} />
        <InfoTip text={info.invoices} />
      </div>
      <AccountContracts contracts={data.contracts} />
      <YearFilter years={years} year={year} onChange={onYear} />
      <InvoiceTable invoices={visible} />
    </>
  );
}

function sum(invoices: { amount: string }[]): string {
  const cents = invoices.reduce((total, invoice) => total + toCents(invoice.amount), 0);
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  return `${negative ? "-" : ""}${Math.floor(absolute / 100).toString()}.${String(absolute % 100).padStart(2, "0")}`;
}

function toCents(value: string): number {
  const negative = value.startsWith("-");
  const [whole = "0", fraction = "00"] = (negative ? value.slice(1) : value).split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
  return negative ? -cents : cents;
}
