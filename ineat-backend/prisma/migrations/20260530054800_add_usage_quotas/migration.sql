CREATE TYPE "UsageType" AS ENUM ('AI_RECIPE_GENERATION', 'DRIVE_IMPORT');

CREATE TABLE "UsageQuota" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "usageType" "UsageType" NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "limit" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UsageQuota_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UsageQuota_userId_usageType_periodStart_periodEnd_key"
  ON "UsageQuota"("userId", "usageType", "periodStart", "periodEnd");

CREATE INDEX "UsageQuota_periodEnd_idx" ON "UsageQuota"("periodEnd");
CREATE INDEX "UsageQuota_usageType_idx" ON "UsageQuota"("usageType");
CREATE INDEX "UsageQuota_userId_idx" ON "UsageQuota"("userId");

ALTER TABLE "UsageQuota"
  ADD CONSTRAINT "UsageQuota_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
