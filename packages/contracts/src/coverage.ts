import { z } from "zod";

export const noteCoverageResponseSchema = z.object({
  source: z.enum(["model", "phrases"]),
  classified: z.number(),
  total: z.number(),
  agreement: z.object({ matched: z.number(), known: z.number() }).nullable(),
  message: z.string(),
});

export type NoteCoverageResponse = z.infer<typeof noteCoverageResponseSchema>;
