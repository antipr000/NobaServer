/*
  Warnings:

  - You are about to drop the column `creditAmount` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `creditConsumerID` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `creditCurrency` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `debitAmount` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `debitConsumerID` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `debitCurrency` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `consumerID` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_creditConsumerID_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_debitConsumerID_fkey";

-- AlterTable
ALTER TABLE "Consumer" ALTER COLUMN "displayEmail" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "creditAmount",
DROP COLUMN "creditConsumerID",
DROP COLUMN "creditCurrency",
DROP COLUMN "debitAmount",
DROP COLUMN "debitConsumerID",
DROP COLUMN "debitCurrency",
ADD COLUMN     "amount" DOUBLE PRECISION,
ADD COLUMN     "consumerID" TEXT NOT NULL,
ADD COLUMN     "currency" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
