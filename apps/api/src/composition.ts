import { createNoteAnalyzer, type NoteAnalyzer } from "@meridian/ai";
import { checkDatabase } from "@meridian/db";
import { domain } from "@meridian/domain";
import { listSourceFiles, type SourceFile } from "@meridian/pipeline";

export type AppContext = {
  domain: typeof domain;
  listSourceFiles: (directory: string) => Promise<SourceFile[]>;
  checkDatabase: (databaseUrl?: string) => Promise<void>;
  noteAnalyzer: NoteAnalyzer;
};

export function createAppContext(): AppContext {
  return {
    domain,
    listSourceFiles,
    checkDatabase,
    noteAnalyzer: createNoteAnalyzer(),
  };
}
