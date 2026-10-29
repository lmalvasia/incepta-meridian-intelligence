import { z } from "zod";

export const qualityResponseSchema = z.object({
  moving: z.array(
    z.object({
      kind: z.enum(["repeated_name", "no_customer", "broken_contract"]),
      label: z.string(),
      amount: z.string().nullable(),
    }),
  ),
  otherIssues: z.array(
    z.object({
      code: z.string(),
      severity: z.enum(["info", "warning", "error"]),
      description: z.string(),
      amountImpact: z.string().nullable(),
      subject: z.string().nullable(),
    }),
  ),
  otherIssueCount: z.number(),
  collapsedCopies: z.array(
    z.object({
      count: z.number(),
      amount: z.string(),
    }),
  ),
});

export type QualityResponse = z.infer<typeof qualityResponseSchema>;
