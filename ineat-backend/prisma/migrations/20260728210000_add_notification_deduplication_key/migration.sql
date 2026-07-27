ALTER TABLE "Notification"
ADD COLUMN "deduplicationKey" VARCHAR(32);

WITH ranked_notifications AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "type", "referenceId", "referenceType"
      ORDER BY
        "isRead" ASC,
        "resolvedAt" ASC NULLS FIRST,
        "dismissedAt" ASC NULLS FIRST,
        "updatedAt" DESC,
        "id" ASC
    ) AS "duplicateRank"
  FROM "Notification"
)
DELETE FROM "Notification"
WHERE "id" IN (
  SELECT "id"
  FROM ranked_notifications
  WHERE "duplicateRank" > 1
);

UPDATE "Notification"
SET "deduplicationKey" = MD5(
  "userId" || CHR(31) ||
  "type"::TEXT || CHR(31) ||
  COALESCE("referenceType", '<none>') || CHR(31) ||
  COALESCE("referenceId", '<none>')
);

ALTER TABLE "Notification"
ALTER COLUMN "deduplicationKey" SET NOT NULL;

CREATE UNIQUE INDEX "Notification_deduplicationKey_key"
ON "Notification"("deduplicationKey");
