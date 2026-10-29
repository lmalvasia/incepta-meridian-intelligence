import type { RevenueAnalysis, RevenueFacts } from "@meridian/ai";
import type { AnalysisRecordStore } from "./analysis-records.js";
import { contentHash } from "./content-hash.js";

export async function resolveAnalysis(
  store: AnalysisRecordStore,
  model: string,
  facts: RevenueFacts,
  analyze: (facts: RevenueFacts) => Promise<RevenueAnalysis>,
): Promise<RevenueAnalysis> {
  const factsHash = contentHash(facts.text);
  const saved = await store.read(model, factsHash);
  if (saved !== null) {
    return { status: "ready", focus: saved.focus, text: saved.text };
  }
  const result = await analyze(facts);
  if (result.status === "ready") {
    await store.save(model, factsHash, { focus: result.focus, text: result.text });
  }
  return result;
}
