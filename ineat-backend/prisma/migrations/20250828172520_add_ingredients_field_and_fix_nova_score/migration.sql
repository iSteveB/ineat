/*
  Warnings:

  - The values [A,B,C,D] on the enum `Novascore` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."Novascore_new" AS ENUM ('GROUP_1', 'GROUP_2', 'GROUP_3', 'GROUP_4');
ALTER TABLE "public"."Product" ALTER COLUMN "novascore" TYPE "public"."Novascore_new" USING ("novascore"::text::"public"."Novascore_new");
ALTER TYPE "public"."Novascore" RENAME TO "Novascore_old";
ALTER TYPE "public"."Novascore_new" RENAME TO "Novascore";
DROP TYPE "public"."Novascore_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "ingredients" TEXT;
