import "./load-env.js";
import { resolveNotes } from "./analysis/resolve-notes.js";
import { createAppContext } from "./composition.js";

const noProvider = "No LLM provider is configured.";

async function main(): Promise<void> {
  const context = createAppContext();
  const snapshot = await context.loadSnapshot();
  const result = await resolveNotes(
    context.noteRecords,
    context.modelName,
    snapshot.notes.map((note) => ({ noteId: note.sourceNoteId, text: note.noteText })),
    (pending) => context.classifyNotes(pending),
  );
  if (result.failure === noProvider) {
    console.log("Note classification skipped. No LLM provider is configured.");
    return;
  }
  if (result.failure !== null) {
    console.error(result.failure);
    process.exitCode = 1;
    return;
  }
  console.log(`Note classifications ready: ${(result.notes?.length ?? 0).toString()}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
