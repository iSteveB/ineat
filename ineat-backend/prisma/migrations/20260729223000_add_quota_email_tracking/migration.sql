ALTER TABLE "UsageQuota"
ADD COLUMN "warningEmailSentAt" TIMESTAMP(3),
ADD COLUMN "reachedEmailSentAt" TIMESTAMP(3);
