import { PageHeader } from "../components/PageHeader";
import { PageState } from "../components/PageState";
import { RevenueCharts } from "../components/revenue/RevenueCharts";
import { RevenueDetail } from "../components/revenue/RevenueDetail";
import { useRevenue } from "../hooks/useRevenue";

export function RevenuePage() {
  const revenue = useRevenue();
  return (
    <>
      <PageHeader title="Revenue" description="January through June, 2025 against 2026." />
      <PageState query={revenue}>
        {(data) => (
          <>
            <RevenueCharts revenue={data} />
            <RevenueDetail revenue={data} />
          </>
        )}
      </PageState>
    </>
  );
}
