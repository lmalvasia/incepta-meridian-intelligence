export type ParsedMoney =
  | { kind: "blank" }
  | { kind: "amount"; cents: bigint; decimal: string }
  | { kind: "invalid"; reason: string };

const AMOUNT = /^(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/;

export function formatDecimal(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole.toString()}.${fraction}`;
}

export function addCents(values: Iterable<bigint>): bigint {
  let total = 0n;
  for (const value of values) {
    total += value;
  }
  return total;
}

/**
 * Parse an exported amount into signed cents.
 * `$`, thousands separators, a leading minus, and parentheses are explicit.
 * Blank stays blank. More than two fractional digits is invalid.
 * Nothing is rounded and a blank is never turned into zero.
 */
export function parseMoney(raw: string): ParsedMoney {
  if (raw.trim() === "") {
    return { kind: "blank" };
  }

  let text = raw.trim();
  let negative = false;

  if (text.startsWith("(") && text.endsWith(")")) {
    negative = true;
    text = text.slice(1, -1).trim();
    if (text === "") {
      return { kind: "invalid", reason: `Amount "${raw}" is not a recognized currency value.` };
    }
  }

  if (text.startsWith("-")) {
    if (negative) {
      return { kind: "invalid", reason: `Amount "${raw}" has both parentheses and a minus sign.` };
    }
    negative = true;
    text = text.slice(1).trim();
  }

  if (text.startsWith("$")) {
    text = text.slice(1).trim();
  }

  if (!AMOUNT.test(text)) {
    return { kind: "invalid", reason: `Amount "${raw}" is not a recognized currency value.` };
  }

  const [wholePart, fractionPart] = text.replaceAll(",", "").split(".");
  if (wholePart === undefined) {
    return { kind: "invalid", reason: `Amount "${raw}" is not a recognized currency value.` };
  }
  if (fractionPart !== undefined && fractionPart.length > 2) {
    return { kind: "invalid", reason: `Amount "${raw}" has more than two decimal places.` };
  }

  const fraction = (fractionPart ?? "").padEnd(2, "0");
  let cents = BigInt(wholePart) * 100n + BigInt(fraction === "" ? "0" : fraction);
  if (negative) {
    cents = -cents;
  }

  return { kind: "amount", cents, decimal: formatDecimal(cents) };
}
