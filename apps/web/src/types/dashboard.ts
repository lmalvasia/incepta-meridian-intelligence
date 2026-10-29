import type { RevenueResponse } from "@meridian/contracts";

export type {
  AccountInvoicesResponse,
  AccountResponse,
  CustomersResponse,
  QualityResponse,
  RevenueResponse,
} from "@meridian/contracts";

export type RevenuePeriod = RevenueResponse["periods"][number];
