CREATE TYPE "PackageStatus" AS ENUM ('UNOPENED', 'OPENED');

CREATE TYPE "PreparationStatus" AS ENUM ('RAW', 'COOKED');

ALTER TABLE "InventoryItem"
ADD COLUMN "packageStatus" "PackageStatus",
ADD COLUMN "preparationStatus" "PreparationStatus";
