/*
  Warnings:

  - Added the required column `type` to the `Mono` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Mono_collectionLinkID_key";

-- DropIndex
DROP INDEX "Mono_monoTransactionID_idx";

-- AlterTable
ALTER TABLE "Mono" ADD COLUMN     "batchID" TEXT,
ADD COLUMN     "declinationReason" TEXT,
ADD COLUMN     "monoPaymentTransactionID" TEXT,
ADD COLUMN     "transferID" TEXT,
ADD COLUMN     "type" TEXT NOT NULL,
ALTER COLUMN "collectionLinkID" DROP NOT NULL,
ALTER COLUMN "collectionURL" DROP NOT NULL;
