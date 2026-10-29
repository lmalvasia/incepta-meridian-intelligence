import type { RevenueReport } from "@meridian/domain";

export function revenueFacts(report: RevenueReport): { text: string; allowedAmounts: string[] } {
  const amounts = new Set<string>();
  const lines = [`Billed through ${report.through}.`];
  for (const period of report.periods) {
    lines.push(`${period.label} billed ${period.billed}.`);
    lines.push(
      `Assigned ${period.split.assigned}. Disputed ${period.split.disputed}. No customer ${period.split.noCustomer}. Excluded ${period.split.excluded}.`,
    );
    amounts.add(period.billed);
    amounts.add(period.split.assigned);
    amounts.add(period.split.disputed);
    amounts.add(period.split.noCustomer);
    amounts.add(period.split.excluded);
    for (const month of period.months) {
      lines.push(`${month.month} ${month.billed}.`);
      amounts.add(month.billed);
    }
    for (const line of period.serviceLines) {
      lines.push(`${line.name} ${line.billed}.`);
      amounts.add(line.billed);
    }
  }
  return { text: lines.join("\n"), allowedAmounts: [...amounts] };
}
