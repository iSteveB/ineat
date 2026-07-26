ALTER TABLE "ResendWebhookEvent"
ADD COLUMN "emailType" TEXT,
ADD COLUMN "recipientRef" TEXT;

CREATE TABLE "EmailSuppression" (
    "recipientRef" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("recipientRef")
);
