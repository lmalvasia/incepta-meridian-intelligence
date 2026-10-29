import { PageHeader } from "../components/PageHeader";
import { PageState } from "../components/PageState";
import { IssueGroups } from "../components/quality/IssueGroups";
import { useQuality } from "../hooks/useQuality";

export function QualityPage() {
  const quality = useQuality();
  return (
    <>
      <PageHeader
        title="Data quality"
        description="Dollar-moving problems first, then every stored issue that does not change the billed total."
      />
      <PageState query={quality}>{(data) => <IssueGroups quality={data} />}</PageState>
    </>
  );
}
