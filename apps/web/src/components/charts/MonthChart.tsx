import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { MonthPoint } from "../../types/series";
import { compactMoney } from "../../utils/money";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { MoneyTooltip } from "./MoneyTooltip";

type MonthChartProps = {
  points: MonthPoint[];
};

const config = {
  prior: { label: "H1 2025", color: "var(--chart-1)" },
  current: { label: "H1 2026", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function MonthChart({ points }: MonthChartProps) {
  return (
    <ChartContainer config={config} className="aspect-auto! h-80 w-full">
      <BarChart data={points} margin={{ left: 4, right: 8, bottom: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickFormatter={compactMoney} width={48} tickLine={false} axisLine={false} />
        <ChartTooltip content={<MoneyTooltip />} />
        <Bar dataKey="prior" name="H1 2025" fill="var(--color-prior)" radius={4} />
        <Bar dataKey="current" name="H1 2026" fill="var(--color-current)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
