import type { RevenueResponse } from "../../types/dashboard";
import { info } from "../../utils/info";
import { findPeriod, monthPoints, servicePoints } from "../../utils/series";
import { MonthChart } from "../charts/MonthChart";
import { ServiceLineChart } from "../charts/ServiceLineChart";
import { InfoTip } from "../InfoTip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type RevenueChartsProps = {
  revenue: RevenueResponse;
};

export function RevenueCharts({ revenue }: RevenueChartsProps) {
  const prior = findPeriod(revenue, "h1-2025");
  const current = findPeriod(revenue, "h1-2026");
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Month against month</CardTitle>
            <InfoTip text={info.months} />
          </div>
          <CardDescription>January through June. H1 2025 is the first bar in each pair.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <SeriesLegend />
          <MonthChart points={monthPoints(revenue)} />
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>H1 2025 service lines</CardTitle>
              <InfoTip text={info.serviceLines} />
            </div>
          </CardHeader>
          <CardContent>
            <ServiceLineChart points={servicePoints(prior)} color="var(--chart-1)" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>H1 2026 service lines</CardTitle>
              <InfoTip text={info.serviceLines} />
            </div>
          </CardHeader>
          <CardContent>
            <ServiceLineChart points={servicePoints(current)} color="var(--chart-2)" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SeriesLegend() {
  return (
    <div className="flex gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-[var(--chart-1)]" />
        H1 2025
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-[var(--chart-2)]" />
        H1 2026
      </span>
    </div>
  );
}
