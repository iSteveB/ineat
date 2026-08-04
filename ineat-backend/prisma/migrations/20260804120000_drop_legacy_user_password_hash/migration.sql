-- Password credentials have been stored in account.password since Better Auth
-- was introduced. The legacy User.passwordHash column is no longer used.
ALTER TABLE "User" DROP COLUMN "passwordHash";
