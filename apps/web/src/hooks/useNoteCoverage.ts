import { noteCoverageResponseSchema } from "@meridian/contracts";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "../utils/api";

export function useNoteCoverage() {
  return useQuery({
    queryKey: ["notes-coverage"],
    queryFn: async () => {
      const body = await getJson<unknown>("/notes/coverage");
      const parsed = noteCoverageResponseSchema.safeParse(body);
      if (!parsed.success) {
        throw new Error("Coverage unavailable.");
      }
      return parsed.data;
    },
  });
}
