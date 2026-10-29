import {
  analyzeRevenue,
  classifyNoteBatches,
  createChatModel,
  createNoteAnalyzer,
  createUnavailableClassifier,
  createUnavailableRevenueAnalyst,
  type LanguageModel,
  type NoteAnalyzer,
  type NoteClassification,
  type NoteToClassify,
  type RevenueAnalysis,
  type RevenueFacts,
} from "@meridian/ai";
import { checkDatabase } from "@meridian/db";
import { domain } from "@meridian/domain";
import { listSourceFiles, type SourceFile } from "@meridian/pipeline";
import { createAnalysisRecordStore, type AnalysisRecordStore } from "./analysis/analysis-records.js";
import { createNoteRecordStore, type NoteRecordStore } from "./analysis/note-records.js";
import { loadSnapshot } from "./read/load-snapshot.js";
import type { Snapshot } from "./types/snapshot.js";

const unavailableClassifier = createUnavailableClassifier();
const unavailableAnalyst = createUnavailableRevenueAnalyst();
const languageModel = modelFromEnv();

export type AppContext = {
  domain: typeof domain;
  listSourceFiles: (directory: string) => Promise<SourceFile[]>;
  checkDatabase: (databaseUrl?: string) => Promise<void>;
  noteAnalyzer: NoteAnalyzer;
  loadSnapshot: () => Promise<Snapshot>;
  modelName: string;
  noteRecords: NoteRecordStore;
  analysisRecords: AnalysisRecordStore;
  classifyNotes: (notes: readonly NoteToClassify[]) => Promise<NoteClassification>;
  analyzeRevenue: (facts: RevenueFacts) => Promise<RevenueAnalysis>;
};

export function createAppContext(): AppContext {
  return {
    domain,
    listSourceFiles,
    checkDatabase,
    noteAnalyzer: createNoteAnalyzer(),
    loadSnapshot,
    modelName: configuredModelName(),
    noteRecords: createNoteRecordStore(),
    analysisRecords: createAnalysisRecordStore(),
    classifyNotes: (notes) => classifyWithModel(languageModel, notes),
    analyzeRevenue: (facts) => analyzeWithModel(languageModel, facts),
  };
}

function configuredModelName(): string {
  return process.env["AI_MODEL"]?.trim() || "gpt-5.5";
}

function modelFromEnv(): LanguageModel | null {
  const apiKey = process.env["AI_API_KEY"]?.trim();
  if (apiKey === undefined || apiKey.length === 0) {
    return null;
  }
  return createChatModel({
    apiKey,
    baseUrl: process.env["AI_BASE_URL"]?.trim() || "https://api.openai.com/v1",
    model: configuredModelName(),
  });
}

let modelBlock: string | null = null;

const noteFlights = new Map<string, Promise<NoteClassification>>();

async function classifyWithModel(model: LanguageModel | null, notes: readonly NoteToClassify[]): Promise<NoteClassification> {
  if (model === null) {
    return unavailableClassifier.classify(notes);
  }
  if (modelBlock !== null) {
    return { status: "unavailable", reason: modelBlock };
  }
  const key = notes.map((note) => `${note.noteId}\n${note.text}`).join("\n---\n");
  const existing = noteFlights.get(key);
  if (existing !== undefined) {
    return existing;
  }
  const flight = runClassification(model, notes).finally(() => {
    noteFlights.delete(key);
  });
  noteFlights.set(key, flight);
  return flight;
}

async function runClassification(model: LanguageModel, notes: readonly NoteToClassify[]): Promise<NoteClassification> {
  try {
    return await classifyNoteBatches(model, notes);
  } catch (error) {
    return { status: "unavailable", reason: rememberBlock(error) };
  }
}

async function analyzeWithModel(model: LanguageModel | null, facts: RevenueFacts): Promise<RevenueAnalysis> {
  if (model === null) {
    return unavailableAnalyst.analyze(facts);
  }
  if (modelBlock !== null) {
    return { status: "unavailable", reason: modelBlock };
  }
  try {
    return await analyzeRevenue(model, facts);
  } catch (error) {
    return { status: "unavailable", reason: rememberBlock(error) };
  }
}

function rememberBlock(error: unknown): string {
  const reason = error instanceof Error ? error.message : "The model request failed.";
  if (reason === "The model has no credits remaining." || reason === "The model rejected the API key.") {
    modelBlock = reason;
  }
  return reason;
}
