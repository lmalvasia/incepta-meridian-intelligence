import { z } from "zod";

const moneySplitSchema = z.object({
  assigned: z.string(),
  disputed: z.string(),
  noCustomer: z.string(),
  excluded: z.string(),
});

const periodSchema = z.object({
  id: z.enum(["h1-2025", "h1-2026"]),
  label: z.string(),
  from: z.string(),
  to: z.string(),
  billed: z.string(),
  split: moneySplitSchema,
  months: z.array(z.object({ month: z.string(), billed: z.string() })),
  serviceLines: z.array(z.object({ name: z.string(), billed: z.string() })),
});

export const revenueResponseSchema = z.object({
  through: z.string(),
  periods: z.array(periodSchema),
});

export type RevenueResponse = z.infer<typeof revenueResponseSchema>;
