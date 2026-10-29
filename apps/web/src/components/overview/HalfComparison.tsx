import type { RevenueResponse } from "../../types/dashboard";
import { dollars, formatMoney, formatSignedChange } from "../../utils/money";
import { findPeriod } from "../../utils/series";
import { info } from "../../utils/info";
import { HalfChart } from "../charts/HalfChart";
import { InfoTip } from "../InfoTip";
import { PageLink } from "../PageLink";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type HalfComparisonProps = {
  revenue: RevenueResponse;
};

export function HalfComparison({ revenue }: HalfComparisonProps) {
  const current = findPeriod(revenue, "h1-2026");
  const prior = findPeriod(revenue, "h1-2025");
  if (current === undefined || prior === undefined) {
    return <p className="text-sm text-muted-foreground">Revenue periods are missing.</p>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Billed</CardTitle>
          <InfoTip text={info.billed} />
        </div>
        <CardDescription>Through June 28</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-[minmax(0,1fr)_18rem] md:items-end">
        <div className="flex flex-col gap-2">
          <p className="text-3xl font-semibold tracking-tight">{formatMoney(current.billed)}</p>
          <p className="text-sm text-muted-foreground">{current.label}</p>
          <p className="text-sm">
            {prior.label}: {formatMoney(prior.billed)}
          </p>
          <p className="text-sm">Change: {formatSignedChange(current.billed, prior.billed)}</p>
          <PageLink to="/revenue">Open revenue</PageLink>
        </div>
        <HalfChart priorLabel="H1 2025" prior={dollars(prior.billed)} currentLabel="H1 2026" current={dollars(current.billed)} />
      </CardContent>
    </Card>
  );
}
