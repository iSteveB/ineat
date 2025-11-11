-- AlterTable
ALTER TABLE "ReceiptItem" ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "storageLocation" TEXT;
