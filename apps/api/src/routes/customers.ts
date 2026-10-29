import { customersResponseSchema } from "@meridian/contracts";
import { buildAccounts, noteCoverage } from "@meridian/domain";
import type { FastifyInstance } from "fastify";
import { changedSinceLastRun } from "../analysis/last-notes.js";
import { savedModelNotes } from "../analysis/saved-notes.js";
import type { AppContext } from "../composition.js";

export function registerCustomers(app: FastifyInstance, context: AppContext): void {
  app.get("/customers", async () => {
    const snapshot = await context.loadSnapshot();
    const pending = snapshot.notes.map((note) => ({ noteId: note.sourceNoteId, text: note.noteText }));
    const modelNotes = await savedModelNotes(context.noteRecords, context.modelName, pending);
    const serialized = modelNotes === null ? null : modelNotes.map((note) => `${note.noteId}:${note.category}`).join("|");
    return customersResponseSchema.parse({
      accounts: buildAccounts({ ...snapshot, modelNotes }),
      coverage: noteCoverage(snapshot.notes, modelNotes),
      changedSinceLastRun: changedSinceLastRun(serialized),
    });
  });
}
