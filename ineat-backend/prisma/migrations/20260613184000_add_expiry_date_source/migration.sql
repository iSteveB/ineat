CREATE TYPE "ExpiryDateSource" AS ENUM ('MANUAL', 'ESTIMATED');

ALTER TABLE "InventoryItem"
ADD COLUMN "expiryDateSource" "ExpiryDateSource" NOT NULL DEFAULT 'MANUAL';
