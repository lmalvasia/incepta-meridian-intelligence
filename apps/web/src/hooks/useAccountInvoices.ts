import { useQuery } from "@tanstack/react-query";
import type { AccountInvoicesResponse } from "../types/dashboard";
import { getJson } from "../utils/api";

export function useAccountInvoices(sourceId: string) {
  return useQuery({
    queryKey: ["invoices", sourceId],
    queryFn: () => getJson<AccountInvoicesResponse>(`/customers/${encodeURIComponent(sourceId)}/invoices`),
  });
}
