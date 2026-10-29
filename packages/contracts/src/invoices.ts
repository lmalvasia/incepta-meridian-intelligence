import { z } from "zod";

export const accountInvoiceSchema = z.object({
  sourceInvoiceId: z.string(),
  billingSystem: z.enum(["quickbooks", "netsuite"]),
  invoiceDate: z.string(),
  status: z.string(),
  amount: z.string(),
  serviceLine: z.string().nullable(),
  linkStatus: z.enum(["linked", "held", "unmatched"]),
});

export const accountContractSchema = z.object({
  sourceContractId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  autoRenew: z.string().nullable(),
  state: z.enum(["broken", "ended", "open"]),
  stillBilling: z.boolean(),
});

export const accountInvoicesResponseSchema = z.object({
  sourceId: z.string(),
  displayName: z.string(),
  invoices: z.array(accountInvoiceSchema),
  contracts: z.array(accountContractSchema),
});

export type AccountInvoicesResponse = z.infer<typeof accountInvoicesResponseSchema>;
