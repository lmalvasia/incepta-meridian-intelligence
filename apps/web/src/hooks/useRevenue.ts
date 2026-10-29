import { useQuery } from "@tanstack/react-query";
import type { RevenueResponse } from "../types/dashboard";
import { getJson } from "../utils/api";

export function useRevenue(enabled = true) {
  return useQuery({
    queryKey: ["revenue"],
    queryFn: () => getJson<RevenueResponse>("/revenue"),
    enabled,
  });
}
