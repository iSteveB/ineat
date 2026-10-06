ALTER TABLE "Recipe" ADD COLUMN "generationKey" TEXT;

CREATE UNIQUE INDEX "Recipe_userId_generationKey_key"
ON "Recipe"("userId", "generationKey");
