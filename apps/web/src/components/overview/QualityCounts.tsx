import { Link } from "react-router";
import type { QualityResponse } from "../../types/dashboard";
import { info } from "../../utils/info";
import { InfoTip } from "../InfoTip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type QualityCountsProps = {
  quality: QualityResponse;
};

export function QualityCounts({ quality }: QualityCountsProps) {
  const cards = [
    {
      label: "Repeated names",
      count: quality.moving.filter((issue) => issue.kind === "repeated_name").length,
      text: info.repeatedNames,
    },
    {
      label: "No customer",
      count: quality.moving.filter((issue) => issue.kind === "no_customer").length,
      text: info.missingCustomer,
    },
    {
      label: "Broken contracts",
      count: quality.moving.filter((issue) => issue.kind === "broken_contract").length,
      text: info.brokenContracts,
    },
    { label: "Other issues", count: quality.otherIssueCount, text: info.otherIssues },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{card.label}</CardTitle>
              <InfoTip text={card.text} />
            </div>
          </CardHeader>
          <CardContent>
            <Link to="/data-quality" className="text-2xl font-semibold tracking-tight hover:underline">
              {card.count.toString()}
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
