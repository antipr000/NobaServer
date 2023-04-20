/*
  Warnings:

  - You are about to drop the column `amountInLocalCurrency` on the `PomeloTransaction` table. All the data in the column will be lost.
  - Added the required column `localAmount` to the `PomeloTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transactionAmount` to the `PomeloTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transactionCurrency` to the `PomeloTransaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PomeloTransaction" DROP COLUMN "amountInLocalCurrency",
ADD COLUMN     "localAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "merchantMCC" TEXT NOT NULL,
ADD COLUMN     "merchantName" TEXT NOT NULL,
ADD COLUMN     "transactionAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "transactionCurrency" TEXT NOT NULL;
