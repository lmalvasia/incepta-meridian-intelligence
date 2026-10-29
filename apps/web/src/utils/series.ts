import type { RevenuePeriod, RevenueResponse } from "../types/dashboard";
import type { MonthPoint, ServicePoint } from "../types/series";
import { dollars } from "./money";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] as const;

export const SERVICE_LINES = ["Preventive Maintenance", "Repair", "Emergency Service", "Project/Install"] as const;

export function findPeriod(revenue: RevenueResponse, id: RevenuePeriod["id"]): RevenuePeriod | undefined {
  return revenue.periods.find((period) => period.id === id);
}

export function monthPoints(revenue: RevenueResponse): MonthPoint[] {
  const prior = findPeriod(revenue, "h1-2025");
  const current = findPeriod(revenue, "h1-2026");
  return MONTH_LABELS.map((label, index) => {
    const suffix = `-${String(index + 1).padStart(2, "0")}`;
    return {
      label,
      prior: billedFor(prior, suffix),
      current: billedFor(current, suffix),
    };
  });
}

export function servicePoints(period: RevenuePeriod | undefined): ServicePoint[] {
  return SERVICE_LINES.map((name) => ({
    name,
    billed: dollars(period?.serviceLines.find((line) => line.name === name)?.billed ?? "0"),
  }));
}

function billedFor(period: RevenuePeriod | undefined, suffix: string): number {
  return dollars(period?.months.find((month) => month.month.endsWith(suffix))?.billed ?? "0");
}
