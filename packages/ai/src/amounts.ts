const moneyToken = /\$\s*\d[\d,]*(?:\.\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d{2}/g;

export function checkAmounts(text: string, allowed: readonly string[]): "ready" | "rejected" {
  const allowedCents = new Set(allowed.map(toCents).filter((cents) => cents !== null));
  for (const token of text.match(moneyToken) ?? []) {
    const cents = toCents(token);
    if (cents === null || !allowedCents.has(cents)) {
      return "rejected";
    }
  }
  return "ready";
}

function toCents(raw: string): string | null {
  const negative = raw.trim().startsWith("-");
  const cleaned = raw.replaceAll("$", "").replaceAll(",", "").trim();
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return null;
  }
  const [whole, fraction = ""] = (negative ? cleaned.slice(1) : cleaned).split(".");
  return `${negative ? "-" : ""}${whole ?? "0"}.${(fraction + "00").slice(0, 2)}`;
}
