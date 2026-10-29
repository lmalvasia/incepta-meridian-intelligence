export function sourceIdsIn(reason: string): string[] {
  return [...new Set([...reason.matchAll(/C-\d{4}/g)].map((match) => match[0] ?? ""))].filter(
    (id) => id.length > 0,
  );
}
