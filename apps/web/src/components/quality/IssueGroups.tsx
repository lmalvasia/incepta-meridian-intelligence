import type { QualityResponse } from "../../types/dashboard";
import { info } from "../../utils/info";
import { formatMoney } from "../../utils/money";
import { InfoTip } from "../InfoTip";
import { CollapsedCopies } from "./CollapsedCopies";
import { OtherIssues } from "./OtherIssues";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type IssueGroupsProps = {
  quality: QualityResponse;
};

const groups = [
  { kind: "repeated_name", title: "Repeated names", text: info.repeatedNames },
  { kind: "no_customer", title: "No customer", text: info.missingCustomer },
  { kind: "broken_contract", title: "Broken contracts", text: info.brokenContracts },
] as const;

export function IssueGroups({ quality }: IssueGroupsProps) {
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => {
        const rows = quality.moving.filter((issue) => issue.kind === group.kind);
        return (
          <Card key={group.kind}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{group.title}</CardTitle>
                <InfoTip text={group.text} />
              </div>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? <p className="text-sm text-muted-foreground">None in this group.</p> : null}
              <ul className="flex flex-col gap-2">
                {rows.map((issue) => (
                  <li key={issue.label} className="flex items-baseline justify-between gap-4 text-sm">
                    <span>{issue.label}</span>
                    <span className="shrink-0 font-medium">{issue.amount === null ? "—" : formatMoney(issue.amount)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
      <CollapsedCopies copies={quality.collapsedCopies} />
      <OtherIssues quality={quality} />
    </div>
  );
}
