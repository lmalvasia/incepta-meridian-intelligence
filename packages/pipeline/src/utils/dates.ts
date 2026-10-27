export type ParsedDate =
  | { kind: "blank" }
  | { kind: "date"; iso: string; ambiguous: boolean }
  | { kind: "invalid"; reason: string };

const MONTHS: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

function calendarDate(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
    return null;
  }

  const monthText = month.toString().padStart(2, "0");
  const dayText = day.toString().padStart(2, "0");
  return `${year.toString().padStart(4, "0")}-${monthText}-${dayText}`;
}

/**
 * Accept `YYYY-MM-DD`, US `M/D/YYYY`, and QuickBooks `Mon DD, YYYY`.
 * A slash date is month/day. When both parts are at most 12 and they differ,
 * the month/day reading is stored and the date is marked ambiguous.
 * Day/month is not tried as a fallback.
 */
export function parseDate(raw: string): ParsedDate {
  const text = raw.trim();
  if (text === "") {
    return { kind: "blank" };
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) {
    const stored = calendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    if (stored === null) {
      return { kind: "invalid", reason: `Date "${raw}" is not a real calendar date.` };
    }
    return { kind: "date", iso: stored, ambiguous: false };
  }

  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (slash) {
    const month = Number(slash[1]);
    const day = Number(slash[2]);
    const year = Number(slash[3]);
    const stored = calendarDate(year, month, day);
    if (stored === null) {
      return {
        kind: "invalid",
        reason: `Date "${raw}" is not a real calendar date when read as month/day/year.`,
      };
    }
    const ambiguous = month <= 12 && day <= 12 && month !== day;
    return { kind: "date", iso: stored, ambiguous };
  }

  const monthName = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (\d{4})$/.exec(text);
  if (monthName) {
    const month = MONTHS[monthName[1] ?? ""];
    const stored =
      month === undefined ? null : calendarDate(Number(monthName[3]), month, Number(monthName[2]));
    if (stored === null) {
      return { kind: "invalid", reason: `Date "${raw}" is not a real calendar date.` };
    }
    return { kind: "date", iso: stored, ambiguous: false };
  }

  return {
    kind: "invalid",
    reason: `Date "${raw}" does not match YYYY-MM-DD, M/D/YYYY, or Mon DD, YYYY.`,
  };
}

export function utcDate(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (match === null) {
    throw new Error(`Expected an ISO date, received "${iso}".`);
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}
