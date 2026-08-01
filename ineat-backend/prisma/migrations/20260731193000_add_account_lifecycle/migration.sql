CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_DELETION', 'ANONYMIZED');

ALTER TABLE "User"
ADD COLUMN "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "accountStatusChangedAt" TIMESTAMP(3),
ADD COLUMN "suspendedUntil" TIMESTAMP(3),
ADD COLUMN "moderationReason" TEXT,
ADD COLUMN "deletionScheduledAt" TIMESTAMP(3),
ADD COLUMN "statusBeforeDeletion" "AccountStatus";

CREATE INDEX "User_accountStatus_idx" ON "User"("accountStatus");
CREATE INDEX "User_deletionScheduledAt_idx" ON "User"("deletionScheduledAt");
