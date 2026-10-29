import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { compactMoney } from "../../utils/money";
import { MoneyTooltip } from "./MoneyTooltip";

type HalfChartProps = {
  priorLabel: string;
  prior: number;
  currentLabel: string;
  current: number;
};

const config = {
  billed: { label: "Billed", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function HalfChart({ priorLabel, prior, currentLabel, current }: HalfChartProps) {
  const data = [
    { label: priorLabel, billed: prior },
    { label: currentLabel, billed: current },
  ];
  return (
    <ChartContainer config={config} className="aspect-auto! h-48 w-full">
      <BarChart data={data} margin={{ left: 4, right: 8, bottom: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickFormatter={compactMoney} width={48} tickLine={false} axisLine={false} />
        <ChartTooltip content={<MoneyTooltip />} />
        <Bar dataKey="billed" name="Billed" fill="var(--color-billed)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
