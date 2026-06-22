CREATE TYPE "RecipeIngredientSource" AS ENUM ('INVENTORY', 'BASIC', 'MISSING');
CREATE TYPE "RecipeSource" AS ENUM ('AI', 'MANUAL');
CREATE TYPE "RecipeType" AS ENUM ('STARTER', 'MAIN', 'DESSERT');

ALTER TABLE "Recipe"
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "type" "RecipeType" NOT NULL DEFAULT 'MAIN',
  ADD COLUMN "source" "RecipeSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "basicIngredients" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "missingIngredients" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "steps" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "doneAt" TIMESTAMP(3);

ALTER TABLE "RecipeIngredient"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "source" "RecipeIngredientSource" NOT NULL DEFAULT 'INVENTORY',
  ALTER COLUMN "productId" DROP NOT NULL,
  ALTER COLUMN "quantity" DROP NOT NULL;

UPDATE "RecipeIngredient"
SET "name" = COALESCE("Product"."name", 'Ingrédient')
FROM "Product"
WHERE "RecipeIngredient"."productId" = "Product"."id";

UPDATE "RecipeIngredient"
SET "name" = 'Ingrédient'
WHERE "name" IS NULL;

ALTER TABLE "RecipeIngredient"
  ALTER COLUMN "name" SET NOT NULL;

CREATE INDEX "Recipe_userId_idx" ON "Recipe"("userId");
CREATE INDEX "Recipe_userId_createdAt_idx" ON "Recipe"("userId", "createdAt");
CREATE INDEX "Recipe_userId_type_idx" ON "Recipe"("userId", "type");
CREATE INDEX "RecipeIngredient_source_idx" ON "RecipeIngredient"("source");

ALTER TABLE "Recipe"
  ADD CONSTRAINT "Recipe_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
