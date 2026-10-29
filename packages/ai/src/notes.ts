import type { LanguageModel } from "./model.js";

export const noteCategories = [
  "prospect",
  "competitor",
  "non_renewal",
  "service",
  "billing",
  "price",
  "positive",
  "routine",
] as const;

export type ModelNoteCategory = (typeof noteCategories)[number];

export type NoteToClassify = {
  noteId: string;
  text: string;
};

export type ClassifiedModelNote = {
  noteId: string;
  category: ModelNoteCategory;
  line: string;
};

export type NoteClassification =
  | { status: "unavailable"; reason: string }
  | { status: "ready"; notes: ClassifiedModelNote[] };

const categorySet = new Set<string>(noteCategories);

export function createUnavailableClassifier(): {
  classify(notes: readonly NoteToClassify[]): Promise<NoteClassification>;
} {
  return {
    async classify(): Promise<NoteClassification> {
      return { status: "unavailable", reason: "No LLM provider is configured." };
    },
  };
}

const batchSize = 40;

export async function classifyNoteBatches(
  model: LanguageModel,
  notes: readonly NoteToClassify[],
): Promise<NoteClassification> {
  if (notes.length === 0) {
    return { status: "ready", notes: [] };
  }
  const slices: NoteToClassify[][] = [];
  for (let index = 0; index < notes.length; index += batchSize) {
    slices.push([...notes.slice(index, index + batchSize)]);
  }
  const classified: ClassifiedModelNote[] = [];
  for (const slice of slices) {
    const batch = await classifyNotes(model, slice);
    if (batch.status !== "ready") {
      return batch;
    }
    classified.push(...batch.notes);
  }
  return { status: "ready", notes: classified };
}

export async function classifyNotes(
  model: LanguageModel,
  notes: readonly NoteToClassify[],
): Promise<NoteClassification> {
  const prompt = [
    "Classify each HVAC account note into exactly one category.",
    `Categories: ${noteCategories.join(", ")}.`,
    'Reply with a JSON object {"notes":[{"noteId","category","line"}]}.',
    "line is one English sentence using words from that note. Do not mention money.",
    JSON.stringify(notes.map((note) => ({ noteId: note.noteId, text: note.text }))),
  ].join("\n");
  const raw = await model.complete(prompt, { json: true });
  return { status: "ready", notes: parseNotes(raw) };
}

function parseNotes(raw: string): ClassifiedModelNote[] {
  try {
    const parsed: unknown = JSON.parse(extractJson(raw));
    const rows = Array.isArray(parsed) ? parsed : notesField(parsed);
    return rows.flatMap(acceptedNote);
  } catch {
    return [];
  }
}

function notesField(parsed: unknown): unknown[] {
  if (typeof parsed !== "object" || parsed === null || !("notes" in parsed)) {
    return [];
  }
  const notes = parsed.notes;
  return Array.isArray(notes) ? notes : [];
}

function acceptedNote(value: unknown): ClassifiedModelNote[] {
  if (typeof value !== "object" || value === null) {
    return [];
  }
  const row = value as { noteId?: unknown; category?: unknown; line?: unknown };
  if (typeof row.noteId !== "string" || typeof row.category !== "string" || typeof row.line !== "string") {
    return [];
  }
  if (!categorySet.has(row.category)) {
    return [];
  }
  return [{ noteId: row.noteId, category: row.category as ModelNoteCategory, line: row.line }];
}

function extractJson(raw: string): string {
  const start = raw.indexOf("[") >= 0 && (raw.indexOf("{") < 0 || raw.indexOf("[") < raw.indexOf("{")) ? raw.indexOf("[") : raw.indexOf("{");
  const end = raw.lastIndexOf(start === raw.indexOf("[") ? "]" : "}");
  if (start < 0 || end < start) {
    return raw;
  }
  return raw.slice(start, end + 1);
}
