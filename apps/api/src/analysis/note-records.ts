import { noteCategories, type ModelNoteCategory } from "@meridian/ai";
import { createDb } from "@meridian/db";

export type StoredNote = {
  sourceNoteId: string;
  textHash: string;
  category: ModelNoteCategory;
  line: string;
};

export type NoteRecordStore = {
  read(model: string): Promise<StoredNote[]>;
  save(model: string, notes: readonly StoredNote[]): Promise<void>;
};

const categories = new Set<string>(noteCategories);

export function createNoteRecordStore(): NoteRecordStore {
  return {
    async read(model: string): Promise<StoredNote[]> {
      const db = createDb();
      try {
        const rows = await db.noteClassification.findMany({ where: { model } });
        return rows.flatMap((row) => {
          if (!categories.has(row.category)) {
            return [];
          }
          return [
            {
              sourceNoteId: row.sourceNoteId,
              textHash: row.textHash,
              category: row.category as ModelNoteCategory,
              line: row.line,
            },
          ];
        });
      } finally {
        await db.$disconnect();
      }
    },
    async save(model: string, notes: readonly StoredNote[]): Promise<void> {
      if (notes.length === 0) {
        return;
      }
      const db = createDb();
      try {
        await db.$transaction(
          notes.map((note) =>
            db.noteClassification.upsert({
              where: { sourceNoteId_model: { sourceNoteId: note.sourceNoteId, model } },
              create: {
                sourceNoteId: note.sourceNoteId,
                model,
                textHash: note.textHash,
                category: note.category,
                line: note.line,
              },
              update: {
                textHash: note.textHash,
                category: note.category,
                line: note.line,
                classifiedAt: new Date(),
              },
            }),
          ),
        );
      } finally {
        await db.$disconnect();
      }
    },
  };
}
