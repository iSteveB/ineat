CREATE TYPE "PrimaryGoal" AS ENUM (
  'REDUCE_WASTE',
  'SAVE_MONEY',
  'EAT_BETTER',
  'FIND_MEAL_IDEAS'
);

-- Add the actionable profile fields before removing the legacy classification.
ALTER TABLE "User"
ADD COLUMN "defaultServings" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN "primaryGoal" "PrimaryGoal";

ALTER TABLE "User"
ADD CONSTRAINT "User_defaultServings_check"
CHECK ("defaultServings" BETWEEN 1 AND 20);

ALTER TABLE "User" DROP COLUMN "profileType";
DROP TYPE "ProfileType";
