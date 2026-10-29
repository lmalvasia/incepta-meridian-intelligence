import { useQuery } from "@tanstack/react-query";
import type { QualityResponse } from "../types/dashboard";
import { getJson } from "../utils/api";

export function useQuality() {
  return useQuery({
    queryKey: ["quality"],
    queryFn: () => getJson<QualityResponse>("/quality"),
  });
}
