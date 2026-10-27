-- CreateEnum
CREATE TYPE "BillingSystem" AS ENUM ('quickbooks', 'netsuite');

-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('linked', 'held', 'unmatched');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('info', 'warning', 'error');

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "sourceId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "industry" TEXT,
    "city" TEXT,
    "state" TEXT,
    "accountManager" TEXT,
    "accountStatus" TEXT,
    "createdOn" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "billingSystem" "BillingSystem" NOT NULL,
    "sourceInvoiceId" TEXT NOT NULL,
    "invoiceDate" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "customerRef" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" CHAR(3),
    "memo" TEXT,
    "serviceLine" TEXT,
    "customerId" UUID,
    "linkStatus" "LinkStatus" NOT NULL,
    "linkReason" TEXT NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" UUID NOT NULL,
    "sourceContractId" TEXT NOT NULL,
    "customerRef" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "annualValue" DECIMAL(18,2),
    "billingFrequency" TEXT NOT NULL,
    "autoRenew" TEXT,
    "serviceTier" TEXT NOT NULL,
    "customerId" UUID,
    "linkStatus" "LinkStatus" NOT NULL,
    "linkReason" TEXT NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountNote" (
    "id" UUID NOT NULL,
    "sourceNoteId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "noteDate" DATE NOT NULL,
    "author" TEXT NOT NULL,
    "noteText" TEXT NOT NULL,
    "customerId" UUID,
    "linkStatus" "LinkStatus" NOT NULL,
    "linkReason" TEXT NOT NULL,

    CONSTRAINT "AccountNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataQualityIssue" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "severity" "IssueSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "amountImpact" DECIMAL(18,2),
    "customerId" UUID,
    "invoiceId" UUID,
    "contractId" UUID,
    "noteId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DataQualityIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_sourceId_key" ON "Customer"("sourceId");

-- CreateIndex
CREATE INDEX "Invoice_invoiceDate_idx" ON "Invoice"("invoiceDate");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE INDEX "Invoice_customerRef_idx" ON "Invoice"("customerRef");

-- CreateIndex
CREATE INDEX "Invoice_linkStatus_idx" ON "Invoice"("linkStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_billingSystem_sourceInvoiceId_key" ON "Invoice"("billingSystem", "sourceInvoiceId");

-- CreateIndex
CREATE INDEX "Contract_customerRef_idx" ON "Contract"("customerRef");

-- CreateIndex
CREATE INDEX "Contract_customerId_idx" ON "Contract"("customerId");

-- CreateIndex
CREATE INDEX "Contract_endDate_idx" ON "Contract"("endDate");

-- CreateIndex
CREATE INDEX "Contract_linkStatus_idx" ON "Contract"("linkStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_sourceContractId_key" ON "Contract"("sourceContractId");

-- CreateIndex
CREATE INDEX "AccountNote_customerId_idx" ON "AccountNote"("customerId");

-- CreateIndex
CREATE INDEX "AccountNote_noteDate_idx" ON "AccountNote"("noteDate");

-- CreateIndex
CREATE INDEX "AccountNote_customerName_idx" ON "AccountNote"("customerName");

-- CreateIndex
CREATE INDEX "AccountNote_linkStatus_idx" ON "AccountNote"("linkStatus");

-- CreateIndex
CREATE UNIQUE INDEX "AccountNote_sourceNoteId_key" ON "AccountNote"("sourceNoteId");

-- CreateIndex
CREATE INDEX "DataQualityIssue_code_idx" ON "DataQualityIssue"("code");

-- CreateIndex
CREATE INDEX "DataQualityIssue_customerId_idx" ON "DataQualityIssue"("customerId");

-- CreateIndex
CREATE INDEX "DataQualityIssue_invoiceId_idx" ON "DataQualityIssue"("invoiceId");

-- CreateIndex
CREATE INDEX "DataQualityIssue_contractId_idx" ON "DataQualityIssue"("contractId");

-- CreateIndex
CREATE INDEX "DataQualityIssue_noteId_idx" ON "DataQualityIssue"("noteId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountNote" ADD CONSTRAINT "AccountNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataQualityIssue" ADD CONSTRAINT "DataQualityIssue_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataQualityIssue" ADD CONSTRAINT "DataQualityIssue_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataQualityIssue" ADD CONSTRAINT "DataQualityIssue_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataQualityIssue" ADD CONSTRAINT "DataQualityIssue_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "AccountNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
