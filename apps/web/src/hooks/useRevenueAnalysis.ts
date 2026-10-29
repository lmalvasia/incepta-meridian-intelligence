import { revenueAnalysisResponseSchema } from "@meridian/contracts";
import { useMutation } from "@tanstack/react-query";
import { postJson } from "../utils/api";

export function useRevenueAnalysis() {
  return useMutation({
    mutationFn: async () => {
      const body = await postJson<unknown>("/revenue/analysis");
      const parsed = revenueAnalysisResponseSchema.safeParse(body);
      if (!parsed.success) {
        throw new Error("Analysis unavailable.");
      }
      return parsed.data;
    },
  });
}
