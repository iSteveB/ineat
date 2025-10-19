/*
  Warnings:

  - You are about to drop the column `storeLocation` on the `Receipt` table. All the data in the column will be lost.
  - You are about to drop the column `storeName` on the `Receipt` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Receipt" DROP COLUMN "storeLocation",
DROP COLUMN "storeName",
ADD COLUMN     "merchantAddress" TEXT,
ADD COLUMN     "merchantLocation" TEXT;
