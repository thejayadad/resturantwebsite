/*
  Warnings:

  - You are about to drop the column `apperance` on the `Restaurant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Restaurant" DROP COLUMN "apperance",
ADD COLUMN     "appearance" JSONB;
