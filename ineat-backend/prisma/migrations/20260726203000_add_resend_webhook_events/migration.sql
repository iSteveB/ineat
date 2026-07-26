CREATE TABLE "ResendWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "emailId" TEXT,
    "eventAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResendWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResendWebhookEvent_type_eventAt_idx"
ON "ResendWebhookEvent"("type", "eventAt");
