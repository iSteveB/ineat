-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "category" TEXT;

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");
