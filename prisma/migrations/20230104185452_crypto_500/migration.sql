/*
  Warnings:

  - You are about to drop the column `amount` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `consumerID` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Transaction` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_consumerID_fkey";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "amount",
DROP COLUMN "consumerID",
DROP COLUMN "currency",
ADD COLUMN     "creditAmount" DOUBLE PRECISION,
ADD COLUMN     "creditConsumerID" TEXT,
ADD COLUMN     "creditCurrency" TEXT,
ADD COLUMN     "debitAmount" DOUBLE PRECISION,
ADD COLUMN     "debitConsumerID" TEXT,
ADD COLUMN     "debitCurrency" TEXT;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_debitConsumerID_fkey" FOREIGN KEY ("debitConsumerID") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_creditConsumerID_fkey" FOREIGN KEY ("creditConsumerID") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
