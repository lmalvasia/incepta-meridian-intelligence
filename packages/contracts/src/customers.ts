import { z } from "zod";
import { noteCategorySchema } from "./categories.js";
import { noteCoverageResponseSchema } from "./coverage.js";

export const accountSchema = z.object({
  sourceId: z.string(),
  displayName: z.string(),
  accountManager: z.string().nullable(),
  accountStatus: z.string().nullable(),
  category: noteCategorySchema,
  categorySource: z.enum(["model", "none"]),
  reviewReasons: z.array(z.enum(["contract_ended", "inactive", "note", "no_customer"])),
  reading: z.string(),
  quote: z.string(),
  noteId: z.string().nullable(),
  priorBilled: z.string(),
  currentBilled: z.string(),
  disputed: z.string(),
  repeatedName: z.string().nullable(),
  brokenContract: z.boolean(),
  noCrmName: z.boolean(),
  onWatchList: z.boolean(),
});

export const customersResponseSchema = z.object({
  accounts: z.array(accountSchema),
  coverage: noteCoverageResponseSchema,
  changedSinceLastRun: z.boolean(),
});

export type CustomersResponse = z.infer<typeof customersResponseSchema>;
export type AccountResponse = z.infer<typeof accountSchema>;
