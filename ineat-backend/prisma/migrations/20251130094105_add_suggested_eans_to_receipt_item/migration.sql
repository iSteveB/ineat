-- AlterTable
ALTER TABLE "ReceiptItem" ADD COLUMN     "selectedEan" TEXT,
ADD COLUMN     "suggestedEans" JSONB NOT NULL DEFAULT '[]';
