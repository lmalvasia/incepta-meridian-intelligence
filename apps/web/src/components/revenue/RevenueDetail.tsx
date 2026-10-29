import type { RevenueResponse } from "../../types/dashboard";
import { formatMoney, formatSignedChange } from "../../utils/money";
import { findPeriod, monthPoints, servicePoints } from "../../utils/series";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type RevenueDetailProps = {
  revenue: RevenueResponse;
};

export function RevenueDetail({ revenue }: RevenueDetailProps) {
  const prior = findPeriod(revenue, "h1-2025");
  const current = findPeriod(revenue, "h1-2026");
  const months = monthPoints(revenue);
  const lines = servicePoints(current).map((line, index) => ({
    name: line.name,
    prior: servicePoints(prior)[index]?.billed ?? 0,
    current: line.billed,
  }));
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Months</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>H1 2025</TableHead>
                <TableHead>H1 2026</TableHead>
                <TableHead>Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((month) => (
                <TableRow key={month.label}>
                  <TableCell>{month.label}</TableCell>
                  <TableCell>{formatMoney(month.prior.toFixed(2))}</TableCell>
                  <TableCell>{formatMoney(month.current.toFixed(2))}</TableCell>
                  <TableCell>{formatSignedChange(month.current.toFixed(2), month.prior.toFixed(2))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Service lines</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Line</TableHead>
                <TableHead>H1 2025</TableHead>
                <TableHead>H1 2026</TableHead>
                <TableHead>Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.name}>
                  <TableCell>{line.name}</TableCell>
                  <TableCell>{formatMoney(line.prior.toFixed(2))}</TableCell>
                  <TableCell>{formatMoney(line.current.toFixed(2))}</TableCell>
                  <TableCell>{formatSignedChange(line.current.toFixed(2), line.prior.toFixed(2))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
