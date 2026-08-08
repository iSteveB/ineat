ALTER TABLE "Recipe"
ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Recipe_userId_isFavorite_idx"
ON "Recipe"("userId", "isFavorite");
