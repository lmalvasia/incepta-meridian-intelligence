import { useQuery } from "@tanstack/react-query";
import type { CustomersResponse } from "../types/dashboard";
import { getJson } from "../utils/api";

export function useCustomers(enabled = true) {
  return useQuery({
    queryKey: ["customers"],
    queryFn: () => getJson<CustomersResponse>("/customers"),
    enabled,
  });
}
