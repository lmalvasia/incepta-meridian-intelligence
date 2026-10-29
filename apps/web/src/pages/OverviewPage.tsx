import { PageHeader } from "../components/PageHeader";
import { PageState } from "../components/PageState";
import { HalfComparison } from "../components/overview/HalfComparison";
import { QualityCounts } from "../components/overview/QualityCounts";
import { SplitCards } from "../components/overview/SplitCards";
import { WatchPreview } from "../components/overview/WatchPreview";
import { useCustomers } from "../hooks/useCustomers";
import { useQuality } from "../hooks/useQuality";
import { useRevenue } from "../hooks/useRevenue";

export function OverviewPage() {
  const revenue = useRevenue();
  const customers = useCustomers();
  const quality = useQuality();
  return (
    <>
      <PageHeader title="Overview" description="H1 2026 through June 28, compared with H1 2025." />
      <PageState query={revenue}>
        {(data) => (
          <>
            <HalfComparison revenue={data} />
            <SplitCards revenue={data} />
          </>
        )}
      </PageState>
      <PageState query={quality}>{(data) => <QualityCounts quality={data} />}</PageState>
      <PageState query={customers}>{(data) => <WatchPreview customers={data} />}</PageState>
    </>
  );
}
