import type { UseMutationResult } from "@tanstack/react-query";
import type { RevenueAnalysisResponse } from "@meridian/contracts";
import { dollars } from "../../utils/money";
import { findPeriod } from "../../utils/series";
import { useCustomers } from "../../hooks/useCustomers";
import { useRevenue } from "../../hooks/useRevenue";
import { HalfChart } from "../charts/HalfChart";
import { AccountTags } from "../AccountTags";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type AnalysisDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: UseMutationResult<RevenueAnalysisResponse, Error, void, unknown>;
};

export function AnalysisDialog({ open, onOpenChange, analysis }: AnalysisDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Quick analysis</DialogTitle>
          <DialogDescription>Suggestions from the figures and tags already calculated. Not a forecast.</DialogDescription>
        </DialogHeader>
        {analysis.isPending ? <p className="text-sm text-muted-foreground">Running</p> : null}
        {analysis.isError ? <p className="text-sm">Analysis unavailable.</p> : null}
        {analysis.data === undefined ? null : <AnalysisBody result={analysis.data} />}
      </DialogContent>
    </Dialog>
  );
}

function AnalysisBody({ result }: { result: RevenueAnalysisResponse }) {
  if (result.status === "ready" && result.text !== null) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm whitespace-pre-line">{result.text}</p>
        {result.focus === "notes" ? <NoteExcerpt /> : <RevenueExcerpt />}
      </div>
    );
  }
  if (result.status === "rejected") {
    return <p className="text-sm">Analysis discarded. It cited an amount that is not in the billed figures.</p>;
  }
  return <p className="text-sm">{result.reason ?? "No LLM provider is configured."}</p>;
}

function RevenueExcerpt() {
  const revenue = useRevenue();
  const current = revenue.data === undefined ? undefined : findPeriod(revenue.data, "h1-2026");
  const prior = revenue.data === undefined ? undefined : findPeriod(revenue.data, "h1-2025");
  if (current === undefined || prior === undefined) {
    return null;
  }
  return (
    <HalfChart priorLabel="H1 2025" prior={dollars(prior.billed)} currentLabel="H1 2026" current={dollars(current.billed)} />
  );
}

function NoteExcerpt() {
  const customers = useCustomers();
  const notes = (customers.data?.accounts ?? []).filter((account) => account.quote.length > 0).slice(0, 4);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{customers.data?.coverage.message}</p>
      {notes.map((account) => (
        <div key={account.sourceId} className="flex flex-col gap-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{account.noCrmName ? "No CRM name" : account.displayName}</span>
            <AccountTags account={account} />
          </div>
          <p className="text-muted-foreground">“{account.quote}”</p>
        </div>
      ))}
    </div>
  );
}
