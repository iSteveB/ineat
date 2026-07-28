ALTER TABLE "NotificationPreferences"
ADD COLUMN "weeklyDigestEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "dailyDigestEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "EmailDigestDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailDigestDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailDigestDelivery_userId_type_periodKey_key"
ON "EmailDigestDelivery"("userId", "type", "periodKey");

CREATE INDEX "EmailDigestDelivery_status_updatedAt_idx"
ON "EmailDigestDelivery"("status", "updatedAt");

CREATE INDEX "EmailDigestDelivery_userId_idx"
ON "EmailDigestDelivery"("userId");

ALTER TABLE "EmailDigestDelivery"
ADD CONSTRAINT "EmailDigestDelivery_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
