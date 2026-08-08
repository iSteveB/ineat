CREATE TYPE "InvoiceProcessingStage" AS ENUM (
  'UPLOADED',
  'QUEUED',
  'EXTRACTING',
  'ANALYZING',
  'NORMALIZING',
  'ENRICHING',
  'READY_FOR_REVIEW',
  'FAILED',
  'VALIDATED'
);

CREATE TYPE "InvoiceProcessingEventStatus" AS ENUM (
  'STARTED',
  'COMPLETED',
  'FAILED'
);

ALTER TABLE "Invoice"
  ADD COLUMN "processingStage" "InvoiceProcessingStage" NOT NULL DEFAULT 'UPLOADED',
  ADD COLUMN "processingProgress" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "processingAttempt" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "stageStartedAt" TIMESTAMP(3),
  ADD COLUMN "stageCompletedAt" TIMESTAMP(3),
  ADD COLUMN "processingErrorCode" TEXT;

UPDATE "Invoice"
SET
  "processingStage" = CASE
    WHEN "status" = 'VALIDATED' THEN 'VALIDATED'::"InvoiceProcessingStage"
    WHEN "status" = 'COMPLETED' THEN 'READY_FOR_REVIEW'::"InvoiceProcessingStage"
    WHEN "status" = 'FAILED' THEN 'FAILED'::"InvoiceProcessingStage"
    ELSE 'ANALYZING'::"InvoiceProcessingStage"
  END,
  "processingProgress" = CASE
    WHEN "status" IN ('VALIDATED', 'COMPLETED') THEN 100
    WHEN "status" = 'FAILED' THEN 0
    ELSE 45
  END,
  "stageStartedAt" = "updatedAt",
  "stageCompletedAt" = CASE
    WHEN "status" IN ('VALIDATED', 'COMPLETED', 'FAILED') THEN "updatedAt"
    ELSE NULL
  END;

CREATE TABLE "InvoiceProcessingEvent" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "stage" "InvoiceProcessingStage" NOT NULL,
  "status" "InvoiceProcessingEventStatus" NOT NULL,
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "durationMs" INTEGER,
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvoiceProcessingEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InvoiceProcessingEvent"
  ADD CONSTRAINT "InvoiceProcessingEvent_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Invoice_processingStage_idx" ON "Invoice"("processingStage");
CREATE INDEX "InvoiceProcessingEvent_invoiceId_createdAt_idx"
  ON "InvoiceProcessingEvent"("invoiceId", "createdAt");
CREATE INDEX "InvoiceProcessingEvent_stage_status_idx"
  ON "InvoiceProcessingEvent"("stage", "status");
