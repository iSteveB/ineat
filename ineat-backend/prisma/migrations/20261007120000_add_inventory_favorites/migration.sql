CREATE TABLE "InventoryFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryFavorite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryFavorite_userId_productId_key"
ON "InventoryFavorite"("userId", "productId");

CREATE INDEX "InventoryFavorite_productId_idx"
ON "InventoryFavorite"("productId");

CREATE INDEX "InventoryFavorite_userId_idx"
ON "InventoryFavorite"("userId");

ALTER TABLE "InventoryFavorite"
ADD CONSTRAINT "InventoryFavorite_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryFavorite"
ADD CONSTRAINT "InventoryFavorite_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
