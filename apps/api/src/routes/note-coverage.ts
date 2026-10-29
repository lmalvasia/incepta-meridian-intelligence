import { noteCoverageResponseSchema } from "@meridian/contracts";
import { noteCoverage } from "@meridian/domain";
import type { FastifyInstance } from "fastify";
import { savedModelNotes } from "../analysis/saved-notes.js";
import type { AppContext } from "../composition.js";

export function registerNoteCoverage(app: FastifyInstance, context: AppContext): void {
  app.get("/notes/coverage", async () => {
    const snapshot = await context.loadSnapshot();
    const modelNotes = await savedModelNotes(
      context.noteRecords,
      context.modelName,
      snapshot.notes.map((note) => ({ noteId: note.sourceNoteId, text: note.noteText })),
    );
    return noteCoverageResponseSchema.parse(noteCoverage(snapshot.notes, modelNotes));
  });
}
