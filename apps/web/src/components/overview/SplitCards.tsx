import { Link } from "react-router";
import type { RevenueResponse } from "../../types/dashboard";
import { info } from "../../utils/info";
import { formatMoney } from "../../utils/money";
import { findPeriod } from "../../utils/series";
import { InfoTip } from "../InfoTip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SplitCardsProps = {
  revenue: RevenueResponse;
};

export function SplitCards({ revenue }: SplitCardsProps) {
  const current = findPeriod(revenue, "h1-2026");
  if (current === undefined) {
    return null;
  }
  const cards = [
    { label: "Assigned", amount: current.split.assigned, to: "/revenue", text: info.assigned },
    { label: "Disputed", amount: current.split.disputed, to: "/data-quality", text: info.disputed },
    { label: "No customer", amount: current.split.noCustomer, to: "/data-quality", text: info.noCustomer },
    { label: "Excluded", amount: current.split.excluded, to: "/data-quality", text: info.excluded },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{card.label}</CardTitle>
              <InfoTip text={card.text} />
            </div>
          </CardHeader>
          <CardContent>
            <Link to={card.to} className="text-xl font-semibold hover:underline">
              {formatMoney(card.amount)}
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
