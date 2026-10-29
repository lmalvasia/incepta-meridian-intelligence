import { revenueAnalysisResponseSchema } from "@meridian/contracts";
import { buildAccounts, buildRevenue } from "@meridian/domain";
import type { FastifyInstance } from "fastify";
import { revenueFacts } from "../analysis/facts.js";
import { resolveAnalysis } from "../analysis/resolve-analysis.js";
import { resolveNotes } from "../analysis/resolve-notes.js";
import { signalLines } from "../analysis/signals.js";
import type { AppContext } from "../composition.js";

export function registerRevenueAnalysis(app: FastifyInstance, context: AppContext): void {
  app.post("/revenue/analysis", async () => {
    const snapshot = await context.loadSnapshot();
    const resolved = await resolveNotes(
      context.noteRecords,
      context.modelName,
      snapshot.notes.map((note) => ({ noteId: note.sourceNoteId, text: note.noteText })),
      (pending) => context.classifyNotes(pending),
    );
    const accounts = buildAccounts({ ...snapshot, modelNotes: resolved.notes });
    const base = revenueFacts(buildRevenue(snapshot.invoices, snapshot.collapsedCopies));
    const facts = { text: [base.text, "", ...signalLines(accounts)].join("\n"), allowedAmounts: base.allowedAmounts };
    const result = await resolveAnalysis(context.analysisRecords, context.modelName, facts, (next) =>
      context.analyzeRevenue(next),
    );
    if (result.status === "unavailable") {
      return revenueAnalysisResponseSchema.parse({ status: "unavailable", focus: null, text: null, reason: result.reason });
    }
    if (result.status === "rejected") {
      return revenueAnalysisResponseSchema.parse({
        status: "rejected",
        focus: null,
        text: null,
        reason: "The analysis cited an amount that is not in the billed figures.",
      });
    }
    return revenueAnalysisResponseSchema.parse({ status: "ready", focus: result.focus, text: result.text, reason: null });
  });
}
