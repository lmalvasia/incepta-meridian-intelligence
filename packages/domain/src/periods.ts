export type Period = {
  id: "h1-2025" | "h1-2026";
  label: string;
  from: string;
  to: string;
};

export const h1Prior: Period = { id: "h1-2025", label: "H1 2025", from: "2025-01-01", to: "2025-06-30" };
export const h1Current: Period = {
  id: "h1-2026",
  label: "H1 2026 through June 28",
  from: "2026-01-01",
  to: "2026-06-28",
};

export const periods: readonly Period[] = [h1Prior, h1Current];

export const throughDate = "2026-06-28";
