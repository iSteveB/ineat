-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "externalProductProvider" TEXT,
ADD COLUMN     "externalProductStatus" TEXT,
ADD COLUMN     "externalProductData" JSONB,
ADD COLUMN     "externalProductError" TEXT;

-- CreateIndex
CREATE INDEX "InvoiceItem_externalProductStatus_idx" ON "InvoiceItem"("externalProductStatus");
