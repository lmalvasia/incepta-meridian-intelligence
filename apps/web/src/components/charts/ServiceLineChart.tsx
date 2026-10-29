import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { ServicePoint } from "../../types/series";
import { compactMoney } from "../../utils/money";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { MoneyTooltip } from "./MoneyTooltip";

type ServiceLineChartProps = {
  points: ServicePoint[];
  color: string;
};

export function ServiceLineChart({ points, color }: ServiceLineChartProps) {
  const config = {
    billed: { label: "Billed", color },
  } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto! h-72 w-full">
      <BarChart data={points} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickFormatter={compactMoney} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={132} tickLine={false} axisLine={false} />
        <ChartTooltip content={<MoneyTooltip />} />
        <Bar dataKey="billed" name="Billed" fill="var(--color-billed)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
