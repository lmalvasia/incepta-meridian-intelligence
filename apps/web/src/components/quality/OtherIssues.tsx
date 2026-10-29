import type { QualityResponse } from "../../types/dashboard";
import { issueLabel } from "../../utils/issue-label";
import { formatMoney } from "../../utils/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type OtherIssuesProps = {
  quality: QualityResponse;
};

export function OtherIssues({ quality }: OtherIssuesProps) {
  const groups = groupByCode(quality.otherIssues);
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Issues that do not move billed dollars</h2>
      <p className="text-sm text-muted-foreground">{quality.otherIssueCount.toString()} stored issues. None of these change the billed total.</p>
      {groups.map((group) => (
        <Card key={group.code}>
          <CardHeader>
            <CardTitle>
              {issueLabel(group.code)} · {group.rows.length.toString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Where</TableHead>
                  <TableHead>What happened</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.rows.map((issue, index) => (
                  <TableRow key={`${issue.subject ?? "none"}-${index.toString()}`}>
                    <TableCell>{issue.subject ?? "—"}</TableCell>
                    <TableCell>
                      {issue.description}
                      {issue.amountImpact === null ? "" : ` ${formatMoney(issue.amountImpact)}`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function groupByCode(issues: QualityResponse["otherIssues"]): Array<{ code: string; rows: QualityResponse["otherIssues"] }> {
  const groups: Array<{ code: string; rows: QualityResponse["otherIssues"] }> = [];
  for (const issue of issues) {
    const current = groups.at(-1);
    if (current !== undefined && current.code === issue.code) {
      current.rows.push(issue);
    } else {
      groups.push({ code: issue.code, rows: [issue] });
    }
  }
  return groups;
}
