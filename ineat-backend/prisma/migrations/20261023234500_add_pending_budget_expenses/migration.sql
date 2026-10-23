CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING_BUDGET', 'ATTACHED', 'EXCLUDED');

ALTER TABLE "Expense"
  ALTER COLUMN "budgetId" DROP NOT NULL,
  ADD COLUMN "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING_BUDGET',
  ADD COLUMN "inventoryItemId" TEXT;

UPDATE "Expense"
SET "status" = 'ATTACHED'
WHERE "budgetId" IS NOT NULL;

INSERT INTO "Expense" (
  "id",
  "userId",
  "budgetId",
  "status",
  "amount",
  "date",
  "source",
  "invoiceId",
  "invoiceItemId",
  "notes",
  "category",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  invoice."userId",
  matching_budget."id",
  CASE
    WHEN matching_budget."id" IS NULL THEN 'PENDING_BUDGET'::"ExpenseStatus"
    ELSE 'ATTACHED'::"ExpenseStatus"
  END,
  item."totalPrice",
  COALESCE(invoice."purchaseDate", invoice."createdAt"),
  'Facture Drive',
  invoice."id",
  item."id",
  item."detectedName",
  item."category",
  NOW()
FROM "InvoiceItem" item
JOIN "Invoice" invoice ON invoice."id" = item."invoiceId"
LEFT JOIN "Expense" existing_expense
  ON existing_expense."invoiceItemId" = item."id"
LEFT JOIN LATERAL (
  SELECT budget."id"
  FROM "Budget" budget
  WHERE budget."userId" = invoice."userId"
    AND budget."isActive" = TRUE
    AND budget."periodStart" <= COALESCE(invoice."purchaseDate", invoice."createdAt")
    AND budget."periodEnd" >= COALESCE(invoice."purchaseDate", invoice."createdAt")
  ORDER BY budget."periodStart" DESC
  LIMIT 1
) matching_budget ON TRUE
WHERE item."validated" = TRUE
  AND item."totalPrice" > 0
  AND existing_expense."id" IS NULL;

CREATE UNIQUE INDEX "Expense_inventoryItemId_key" ON "Expense"("inventoryItemId");
CREATE INDEX "Expense_userId_status_date_idx" ON "Expense"("userId", "status", "date");

ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_inventoryItemId_fkey"
  FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
