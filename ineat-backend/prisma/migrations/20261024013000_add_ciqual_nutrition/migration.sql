ALTER TABLE "Product"
ADD COLUMN "ciqualCode" TEXT,
ADD COLUMN "ciqualName" TEXT,
ADD COLUMN "nutritionSource" TEXT,
ADD COLUMN "nutritionSourceVersion" TEXT;

ALTER TABLE "InvoiceItem"
ADD COLUMN "ciqualCode" TEXT,
ADD COLUMN "ciqualName" TEXT,
ADD COLUMN "ciqualMatchConfidence" DOUBLE PRECISION,
ADD COLUMN "ciqualNutrients" JSONB;

CREATE INDEX "Product_ciqualCode_idx" ON "Product"("ciqualCode");
