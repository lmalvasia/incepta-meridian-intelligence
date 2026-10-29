export function isoDate(value: Date): string {
  const year = value.getUTCFullYear().toString();
  const month = (value.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = value.getUTCDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}
