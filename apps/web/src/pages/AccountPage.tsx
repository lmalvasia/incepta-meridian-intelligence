import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { AccountContracts } from "../components/accounts/AccountContracts";
import { AccountNotes } from "../components/accounts/AccountNotes";
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
import { cn } from "@/lib/utils";

export function AccountPage() {
  const params = useParams();
  const sourceId = params.sourceId ?? "";
  const invoices = useAccountInvoices(sourceId);
  const [year, setYear] = useState("all");
  const [tab, setTab] = useState<AccountTab>("invoices");
  return (
    <>
      <PageLink to="/accounts">All accounts</PageLink>
      <PageState query={invoices}>
        {(data) => <AccountInvoices data={data} year={year} onYear={setYear} tab={tab} onTab={setTab} />}
      </PageState>
    </>
  );
}

type AccountTab = "invoices" | "notes";

const tabs: Array<{ id: AccountTab; label: string }> = [
  { id: "invoices", label: "Invoices" },
  { id: "notes", label: "Notes" },
];

type AccountInvoicesProps = {
  data: AccountInvoicesResponse;
  year: string;
  onYear: (year: string) => void;
  tab: AccountTab;
  onTab: (tab: AccountTab) => void;
};

function AccountInvoices({ data, year, onYear, tab, onTab }: AccountInvoicesProps) {
  const years = useMemo(
    () => [...new Set(data.invoices.map((invoice) => invoice.invoiceDate.slice(0, 4)))].sort(),
    [data.invoices],
  );
  const visible = year === "all" ? data.invoices : data.invoices.filter((invoice) => invoice.invoiceDate.startsWith(year));
  const name = data.displayName.length === 0 ? "No CRM name" : data.displayName;
  return (
    <>
      <PageHeader title={name} description={data.sourceId} />
      <AccountContracts contracts={data.contracts} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1" role="tablist">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === tab}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm",
                item.id === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {tab === "invoices" ? <InfoTip text={info.invoices} /> : null}
        {tab === "notes" ? <InfoTip text={info.accountNotes} /> : null}
      </div>
      {tab === "invoices" ? (
        <>
          <p className="text-sm text-muted-foreground">
            {visible.length.toString()} invoices, {formatMoney(sum(visible))}.
          </p>
          <YearFilter years={years} year={year} onChange={onYear} />
          <InvoiceTable invoices={visible} />
        </>
      ) : null}
      {tab === "notes" ? <AccountNotes notes={data.notes} /> : null}
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
