/*
  Warnings:

  - You are about to drop the column `transactionID` on the `Verification` table. All the data in the column will be lost.
  - You are about to drop the column `userID` on the `Verification` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id,consumerID]` on the table `Verification` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Verification_transactionID_key";

-- DropIndex
DROP INDEX "Verification_userID_idx";

-- AlterTable
ALTER TABLE "Verification" DROP COLUMN "transactionID",
DROP COLUMN "userID",
ADD COLUMN     "consumerID" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Verification_id_consumerID_key" ON "Verification"("id", "consumerID");
