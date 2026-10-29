export function formatMoney(decimal: string): string {
  const negative = decimal.startsWith("-");
  const [whole, fraction = "00"] = (negative ? decimal.slice(1) : decimal).split(".");
  const grouped = (whole ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}$${grouped}.${fraction.padEnd(2, "0").slice(0, 2)}`;
}

export function dollars(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function compactMoney(value: number): string {
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) {
    return `${sign}$${(absolute / 1_000_000).toFixed(1)}M`;
  }
  if (absolute >= 1_000) {
    return `${sign}$${Math.round(absolute / 1_000)}k`;
  }
  return formatMoney(value.toFixed(2));
}

export function formatSignedChange(current: string, prior: string): string {
  const delta = toCents(current) - toCents(prior);
  const text = formatMoney(fromCents(Math.abs(delta)));
  if (delta > 0) {
    return `+${text}`;
  }
  if (delta < 0) {
    return `-${text}`;
  }
  return text;
}

function toCents(value: string): number {
  const negative = value.startsWith("-");
  const [whole = "0", fraction = "00"] = (negative ? value.slice(1) : value).split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
  return negative ? -cents : cents;
}

function fromCents(cents: number): string {
  const whole = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, "0");
  return `${whole.toString()}.${fraction}`;
}

