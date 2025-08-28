/*
  Warnings:

  - The values [A,B,C,D] on the enum `NovaScore` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."NovaScore_new" AS ENUM ('GROUP_1', 'GROUP_2', 'GROUP_3', 'GROUP_4');
ALTER TABLE "public"."Product" ALTER COLUMN "novaScore" TYPE "public"."NovaScore_new" USING ("novaScore"::text::"public"."NovaScore_new");
ALTER TYPE "public"."NovaScore" RENAME TO "NovaScore_old";
ALTER TYPE "public"."NovaScore_new" RENAME TO "NovaScore";
DROP TYPE "public"."NovaScore_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "ingredients" TEXT;
