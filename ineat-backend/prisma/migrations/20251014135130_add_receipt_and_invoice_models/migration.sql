-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('RECEIPT_IMAGE', 'INVOICE_PDF', 'INVOICE_HTML');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED', 'VALIDATED');

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL DEFAULT 'RECEIPT_IMAGE',
    "imageUrl" TEXT,
    "pdfUrl" TEXT,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'PROCESSING',
    "rawOcrData" JSONB,
    "merchantName" TEXT,
    "totalAmount" DOUBLE PRECISION,
    "purchaseDate" TIMESTAMP(3),
    "storeName" TEXT,
    "storeLocation" TEXT,
    "invoiceNumber" TEXT,
    "orderNumber" TEXT,
    "ocrProvider" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "processingTime" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptItem" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "productId" TEXT,
    "detectedName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION NOT NULL,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "productCode" TEXT,
    "category" TEXT,
    "discount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Receipt_userId_idx" ON "Receipt"("userId");

-- CreateIndex
CREATE INDEX "Receipt_status_idx" ON "Receipt"("status");

-- CreateIndex
CREATE INDEX "Receipt_documentType_idx" ON "Receipt"("documentType");

-- CreateIndex
CREATE INDEX "Receipt_purchaseDate_idx" ON "Receipt"("purchaseDate");

-- CreateIndex
CREATE INDEX "Receipt_createdAt_idx" ON "Receipt"("createdAt");

-- CreateIndex
CREATE INDEX "ReceiptItem_receiptId_idx" ON "ReceiptItem"("receiptId");

-- CreateIndex
CREATE INDEX "ReceiptItem_productId_idx" ON "ReceiptItem"("productId");

-- CreateIndex
CREATE INDEX "ReceiptItem_productCode_idx" ON "ReceiptItem"("productCode");

-- CreateIndex
CREATE INDEX "ReceiptItem_validated_idx" ON "ReceiptItem"("validated");

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
