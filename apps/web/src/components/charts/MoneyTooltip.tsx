import { formatMoney } from "../../utils/money";

type TooltipItem = {
  dataKey?: string | number;
  name?: string | number;
  value?: string | number;
};

type MoneyTooltipProps = {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string | number;
};

export function MoneyTooltip({ active, payload, label }: MoneyTooltipProps) {
  if (active !== true || payload === undefined || payload.length === 0) {
    return null;
  }
  return (
    <div className="grid min-w-32 gap-1 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow">
      {label === undefined ? null : <p className="font-medium">{label}</p>}
      {payload.map((item) => (
        <p key={String(item.dataKey ?? item.name)}>
          {String(item.name ?? item.dataKey)}: {formatTooltipValue(item.value)}
        </p>
      ))}
    </div>
  );
}

function formatTooltipValue(value: string | number | undefined): string {
  if (typeof value !== "number") {
    return "";
  }
  return formatMoney(value.toFixed(2));
}
