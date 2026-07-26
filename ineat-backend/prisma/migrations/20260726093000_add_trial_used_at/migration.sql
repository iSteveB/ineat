ALTER TABLE "User"
  ADD COLUMN "trialUsedAt" TIMESTAMP(3);

UPDATE "User"
SET "trialUsedAt" = "trialStartedAt"
WHERE "trialStartedAt" IS NOT NULL
  AND "trialUsedAt" IS NULL;
