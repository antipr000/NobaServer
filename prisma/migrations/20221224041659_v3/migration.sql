/*
  Warnings:

  - A unique constraint covering the columns `[transactionID]` on the table `Verification` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Verification_userID_key";

-- CreateIndex
CREATE UNIQUE INDEX "Verification_transactionID_key" ON "Verification"("transactionID");
