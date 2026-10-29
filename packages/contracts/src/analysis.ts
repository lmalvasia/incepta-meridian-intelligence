import { z } from "zod";

export const revenueAnalysisResponseSchema = z.object({
  status: z.enum(["ready", "rejected", "unavailable"]),
  focus: z.enum(["revenue", "notes"]).nullable(),
  text: z.string().nullable(),
  reason: z.string().nullable(),
});

export type RevenueAnalysisResponse = z.infer<typeof revenueAnalysisResponseSchema>;
