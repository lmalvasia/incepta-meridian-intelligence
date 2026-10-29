import type { AnalysisFocus } from "@meridian/ai";
import { createDb } from "@meridian/db";

export type StoredAnalysis = {
  focus: AnalysisFocus;
  text: string;
};

export type AnalysisRecordStore = {
  read(model: string, factsHash: string): Promise<StoredAnalysis | null>;
  save(model: string, factsHash: string, analysis: StoredAnalysis): Promise<void>;
};

export function createAnalysisRecordStore(): AnalysisRecordStore {
  return {
    async read(model: string, factsHash: string): Promise<StoredAnalysis | null> {
      const db = createDb();
      try {
        const row = await db.savedAnalysis.findUnique({ where: { model_factsHash: { model, factsHash } } });
        if (row === null || (row.focus !== "revenue" && row.focus !== "notes")) {
          return null;
        }
        return { focus: row.focus, text: row.text };
      } finally {
        await db.$disconnect();
      }
    },
    async save(model: string, factsHash: string, analysis: StoredAnalysis): Promise<void> {
      const db = createDb();
      try {
        await db.savedAnalysis.upsert({
          where: { model_factsHash: { model, factsHash } },
          create: { model, factsHash, focus: analysis.focus, text: analysis.text },
          update: { focus: analysis.focus, text: analysis.text },
        });
      } finally {
        await db.$disconnect();
      }
    },
  };
}
