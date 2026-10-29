-- CreateTable
CREATE TABLE "NoteClassification" (
    "id" UUID NOT NULL,
    "sourceNoteId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "line" TEXT NOT NULL,
    "classifiedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteClassification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedAnalysis" (
    "id" UUID NOT NULL,
    "model" TEXT NOT NULL,
    "factsHash" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NoteClassification_sourceNoteId_model_key" ON "NoteClassification"("sourceNoteId", "model");

-- CreateIndex
CREATE INDEX "NoteClassification_model_idx" ON "NoteClassification"("model");

-- CreateIndex
CREATE UNIQUE INDEX "SavedAnalysis_model_factsHash_key" ON "SavedAnalysis"("model", "factsHash");
