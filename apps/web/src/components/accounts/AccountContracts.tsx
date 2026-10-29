import type { AccountInvoicesResponse } from "../../types/dashboard";
import { Badge } from "@/components/ui/badge";

type AccountContract = AccountInvoicesResponse["contracts"][number];

type AccountContractsProps = {
  contracts: AccountInvoicesResponse["contracts"];
};

export function AccountContracts({ contracts }: AccountContractsProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">Contracts</h2>
      {contracts.length === 0 ? <p className="text-sm text-muted-foreground">No contract on this account.</p> : null}
      {contracts.map((contract) => (
        <article key={contract.sourceContractId} className="flex flex-col gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium">{contract.sourceContractId}</h3>
            <StateBadge state={contract.state} />
          </div>
          <p className="text-sm">
            Start {contract.startDate}. End {contract.endDate}.
          </p>
          <p className="text-sm text-muted-foreground">{autoRenewLine(contract.autoRenew)}</p>
          <p className="text-sm">{reading(contract)}</p>
        </article>
      ))}
    </section>
  );
}

function StateBadge({ state }: { state: AccountContract["state"] }) {
  if (state === "broken") {
    return <Badge variant="destructive">Broken</Badge>;
  }
  if (state === "ended") {
    return (
      <Badge variant="outline" className="border-transparent bg-amber-500/15 text-amber-950 dark:text-amber-100">
        Ended
      </Badge>
    );
  }
  return <Badge variant="secondary">Open</Badge>;
}

function autoRenewLine(autoRenew: string | null): string {
  if (autoRenew === null || autoRenew.trim().length === 0) {
    return "Auto-renew is blank.";
  }
  if (autoRenew.trim().toLowerCase() === "yes") {
    return `Auto-renew is ${autoRenew}. That does not move the end date.`;
  }
  return `Auto-renew is ${autoRenew}.`;
}

function reading(contract: AccountContract): string {
  if (contract.state === "broken") {
    return "The end date is before the start date. This contract is not counted as ended.";
  }
  if (contract.state === "open") {
    return "The end date is after June 30, 2026.";
  }
  if (contract.stillBilling) {
    return "The end date is on or before June 30, 2026. H1 2026 still has invoices. Check the contract.";
  }
  return "The end date is on or before June 30, 2026. H1 2026 has no invoices.";
}
