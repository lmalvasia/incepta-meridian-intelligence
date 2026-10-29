import { Cell, Label, Pie, PieChart } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export type ShareSlice = {
  id: string;
  label: string;
  value: number;
};

type ShareDonutProps = {
  slices: ShareSlice[];
  config: ChartConfig;
  center: string;
  caption: string;
  activeId?: string | null;
  onSlice?: (id: string) => void;
};

export function ShareDonut({ slices, config, center, caption, activeId = null, onSlice }: ShareDonutProps) {
  const drawn = slices.filter((slice) => slice.value > 0);
  if (drawn.length === 0) {
    return (
      <div className="flex h-32 w-32 shrink-0 flex-col items-center justify-center text-center">
        <span className="text-base font-semibold">{center}</span>
        <span className="text-[10px] text-muted-foreground">{caption}</span>
      </div>
    );
  }
  return (
    <ChartContainer config={config} className="aspect-square! h-32 w-32 shrink-0" initialDimension={{ width: 128, height: 128 }}>
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="id" hideLabel />} />
        <Pie
          data={drawn}
          dataKey="value"
          nameKey="id"
          innerRadius="62%"
          outerRadius="92%"
          paddingAngle={drawn.length > 1 ? 2 : 0}
          stroke="none"
          cursor={onSlice === undefined ? undefined : "pointer"}
          onClick={(_data, index) => {
            const slice = drawn[index];
            if (slice !== undefined && onSlice !== undefined) {
              onSlice(slice.id);
            }
          }}
        >
          {drawn.map((slice) => (
            <Cell key={slice.id} fill={`var(--color-${slice.id})`} opacity={activeId === null || activeId === slice.id ? 1 : 0.35} />
          ))}
          <Label content={centerContent(center, caption)} />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

function centerContent(center: string, caption: string) {
  return function Center({ viewBox }: { viewBox?: { cx?: number; cy?: number } | { x: number; y: number; width: number; height: number } }) {
    if (viewBox === undefined || !("cx" in viewBox) || viewBox.cx === undefined || viewBox.cy === undefined) {
      return null;
    }
    const { cx, cy } = viewBox;
    return (
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
        <tspan x={cx} dy="-0.45em" className="fill-foreground text-base font-semibold">
          {center}
        </tspan>
        <tspan x={cx} dy="1.25em" className="fill-muted-foreground text-[10px]">
          {caption}
        </tspan>
      </text>
    );
  };
}
