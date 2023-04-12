/*
  Warnings:

  - Added the required column `countryCode` to the `PomeloTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entryMode` to the `PomeloTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `origin` to the `PomeloTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pointType` to the `PomeloTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pomeloTransactionType` to the `PomeloTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pomeloUserID` to the `PomeloTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `settlementAmount` to the `PomeloTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `settlementCurrency` to the `PomeloTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source` to the `PomeloTransaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PomeloTransaction" ADD COLUMN     "countryCode" TEXT NOT NULL,
ADD COLUMN     "entryMode" TEXT NOT NULL,
ADD COLUMN     "origin" TEXT NOT NULL,
ADD COLUMN     "pointType" TEXT NOT NULL,
ADD COLUMN     "pomeloTransactionType" TEXT NOT NULL,
ADD COLUMN     "pomeloUserID" TEXT NOT NULL,
ADD COLUMN     "settlementAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "settlementCurrency" TEXT NOT NULL,
ADD COLUMN     "source" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "PomeloTransaction" ADD CONSTRAINT "PomeloTransaction_pomeloUserID_fkey" FOREIGN KEY ("pomeloUserID") REFERENCES "PomeloUser"("pomeloID") ON DELETE CASCADE ON UPDATE CASCADE;
