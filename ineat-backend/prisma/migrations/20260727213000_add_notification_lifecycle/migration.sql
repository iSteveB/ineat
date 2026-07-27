ALTER TABLE "Notification"
ADD COLUMN "dismissedAt" TIMESTAMP(3),
ADD COLUMN "resolvedAt" TIMESTAMP(3),
ADD COLUMN "lastOccurredAt" TIMESTAMP(3);

UPDATE "Notification"
SET "lastOccurredAt" = "createdAt";

ALTER TABLE "Notification"
ALTER COLUMN "lastOccurredAt" SET NOT NULL,
ALTER COLUMN "lastOccurredAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Notification_userId_resolvedAt_dismissedAt_idx"
ON "Notification"("userId", "resolvedAt", "dismissedAt");
