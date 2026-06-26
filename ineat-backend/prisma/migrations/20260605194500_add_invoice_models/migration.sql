-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED', 'VALIDATED');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "invoiceId" TEXT,
ADD COLUMN     "invoiceItemId" TEXT;

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PROCESSING',
    "rawAnalysisData" JSONB,
    "merchantName" TEXT,
    "totalAmount" DOUBLE PRECISION,
    "purchaseDate" TIMESTAMP(3),
    "invoiceNumber" TEXT,
    "orderNumber" TEXT,
    "analysisProvider" TEXT,
    "analysisConfidence" DOUBLE PRECISION,
    "processingTime" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "detectedName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION NOT NULL,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "productCode" TEXT,
    "category" TEXT,
    "discount" DOUBLE PRECISION,
    "selectedEan" TEXT,
    "suggestedEans" JSONB NOT NULL DEFAULT '[]',
    "expiryDate" TIMESTAMP(3),
    "storageLocation" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Expense_invoiceItemId_key" ON "Expense"("invoiceItemId");

-- CreateIndex
CREATE INDEX "Expense_invoiceId_idx" ON "Expense"("invoiceId");

-- CreateIndex
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");

-- CreateIndex
CREATE INDEX "Invoice_purchaseDate_idx" ON "Invoice"("purchaseDate");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");

-- CreateIndex
CREATE INDEX "Invoice_userId_createdAt_idx" ON "Invoice"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_userId_status_createdAt_idx" ON "Invoice"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_userId_purchaseDate_idx" ON "Invoice"("userId", "purchaseDate");

-- CreateIndex
CREATE INDEX "Invoice_userId_totalAmount_idx" ON "Invoice"("userId", "totalAmount");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceItem_productCode_idx" ON "InvoiceItem"("productCode");

-- CreateIndex
CREATE INDEX "InvoiceItem_productId_idx" ON "InvoiceItem"("productId");

-- CreateIndex
CREATE INDEX "InvoiceItem_validated_idx" ON "InvoiceItem"("validated");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_invoiceItemId_fkey" FOREIGN KEY ("invoiceItemId") REFERENCES "InvoiceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
