CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'TRIAL', 'PREMIUM');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

ALTER TABLE "User"
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER',
  ADD COLUMN "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
  ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "trialStartedAt" TIMESTAMP(3),
  ADD COLUMN "trialEndsAt" TIMESTAMP(3),
  ADD COLUMN "currentPeriodStartedAt" TIMESTAMP(3),
  ADD COLUMN "currentPeriodEndsAt" TIMESTAMP(3);

UPDATE "User"
SET
  "role" = CASE
    WHEN "subscription" = 'ADMIN' THEN 'ADMIN'::"UserRole"
    ELSE 'USER'::"UserRole"
  END,
  "subscriptionPlan" = CASE
    WHEN "subscription" IN ('ADMIN', 'PREMIUM') THEN 'PREMIUM'::"SubscriptionPlan"
    ELSE 'FREE'::"SubscriptionPlan"
  END,
  "subscriptionStatus" = 'ACTIVE'::"SubscriptionStatus";

ALTER TABLE "User" DROP COLUMN "subscription";
DROP TYPE "Subscription";
