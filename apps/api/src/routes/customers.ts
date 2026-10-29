import { customersResponseSchema } from "@meridian/contracts";
import { buildAccounts, noteCoverage, type ClassifiedNote } from "@meridian/domain";
import type { FastifyInstance } from "fastify";
import { changedSinceLastRun } from "../analysis/last-notes.js";
import { resolveNotes } from "../analysis/resolve-notes.js";
import type { AppContext } from "../composition.js";

const noProvider = "No LLM provider is configured.";

export function registerCustomers(app: FastifyInstance, context: AppContext): void {
  app.get("/customers", async () => {
    const snapshot = await context.loadSnapshot();
    const resolved = await resolveNotes(
      context.noteRecords,
      context.modelName,
      snapshot.notes.map((note) => ({ noteId: note.sourceNoteId, text: note.noteText })),
      (pending) => context.classifyNotes(pending),
    );
    const modelNotes: ClassifiedNote[] | null = resolved.notes;
    const serialized = modelNotes === null ? null : modelNotes.map((note) => `${note.noteId}:${note.category}`).join("|");
    const coverage = noteCoverage(snapshot.notes, modelNotes);
    if (resolved.failure !== null && !(resolved.failure === noProvider && modelNotes === null)) {
      coverage.message = resolved.failure;
    }
    return customersResponseSchema.parse({
      accounts: buildAccounts({ ...snapshot, modelNotes }),
      coverage,
      changedSinceLastRun: changedSinceLastRun(serialized),
    });
  });
}
