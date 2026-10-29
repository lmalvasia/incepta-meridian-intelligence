export function parseCents(decimal: string): bigint {
  const negative = decimal.startsWith("-");
  const [whole, fraction = ""] = (negative ? decimal.slice(1) : decimal).split(".");
  const digits = `${whole ?? "0"}${(fraction + "00").slice(0, 2)}`;
  const cents = BigInt(digits.length === 0 ? "0" : digits);
  return negative ? -cents : cents;
}

export function formatCents(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole.toString()}.${fraction}`;
}

export function addAmounts(amounts: readonly string[]): string {
  let total = 0n;
  for (const amount of amounts) {
    total += parseCents(amount);
  }
  return formatCents(total);
}
