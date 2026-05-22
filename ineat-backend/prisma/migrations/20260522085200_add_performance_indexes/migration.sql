-- Composite indexes for high-volume user-scoped inventory and receipt queries.
CREATE INDEX "InventoryItem_userId_createdAt_idx" ON "InventoryItem"("userId", "createdAt");
CREATE INDEX "InventoryItem_userId_expiryDate_idx" ON "InventoryItem"("userId", "expiryDate");
CREATE INDEX "InventoryItem_userId_storageLocation_idx" ON "InventoryItem"("userId", "storageLocation");
CREATE INDEX "InventoryItem_userId_productId_storageLocation_expiryDate_idx" ON "InventoryItem"("userId", "productId", "storageLocation", "expiryDate");

CREATE INDEX "Receipt_userId_createdAt_idx" ON "Receipt"("userId", "createdAt");
CREATE INDEX "Receipt_userId_status_createdAt_idx" ON "Receipt"("userId", "status", "createdAt");
CREATE INDEX "Receipt_userId_purchaseDate_idx" ON "Receipt"("userId", "purchaseDate");
CREATE INDEX "Receipt_userId_totalAmount_idx" ON "Receipt"("userId", "totalAmount");
