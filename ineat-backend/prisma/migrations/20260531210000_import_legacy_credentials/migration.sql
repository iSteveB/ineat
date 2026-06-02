-- Existing users authenticated with bcrypt hashes stored on "User".
-- Better Auth expects credential passwords in the "account" table.
INSERT INTO "account" (
    "id",
    "accountId",
    "providerId",
    "userId",
    "password",
    "createdAt",
    "updatedAt"
)
SELECT
    CONCAT('legacy-credential:', "User"."id"),
    "User"."id",
    'credential',
    "User"."id",
    "User"."passwordHash",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User"
WHERE "User"."passwordHash" <> ''
  AND NOT EXISTS (
      SELECT 1
      FROM "account"
      WHERE "account"."providerId" = 'credential'
        AND "account"."userId" = "User"."id"
  );
