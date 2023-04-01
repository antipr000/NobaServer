/*
  Warnings:

  - A unique constraint covering the columns `[pomeloIdempotencyKey]` on the table `PomeloTransaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `pomeloIdempotencyKey` to the `PomeloTransaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PomeloTransaction" ADD COLUMN     "pomeloIdempotencyKey" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PomeloTransaction_pomeloIdempotencyKey_key" ON "PomeloTransaction"("pomeloIdempotencyKey");
