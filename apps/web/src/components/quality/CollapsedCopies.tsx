import type { QualityResponse } from "../../types/dashboard";
import { info } from "../../utils/info";
import { formatMoney } from "../../utils/money";
import { InfoTip } from "../InfoTip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CollapsedCopiesProps = {
  copies: QualityResponse["collapsedCopies"];
};

export function CollapsedCopies({ copies }: CollapsedCopiesProps) {
  if (copies.length === 0) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Identical invoice copies</CardTitle>
          <InfoTip text={info.collapsedCopies} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {copies.map((copy) => (
          <p key={`${copy.count.toString()}-${copy.amount}`} className="text-sm">
            {copy.count.toString()} extra rows in April 2026 repeated an invoice exactly. One row was kept, so the bill stays in the total. The extra copy, {formatMoney(copy.amount)}, is in Excluded and is not added again.
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
