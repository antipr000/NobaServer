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

-- NON NULL column addition
ADD COLUMN     "type" TEXT;

UPDATE "Mono" SET "type" = 'COLLECTION_LINK_DEPOSIT';
ALTER TABLE "Mono" ALTER COLUMN "type" SET NOT NULL;

-- AlterTable
ALTER TABLE "Mono"
ALTER COLUMN "collectionLinkID" DROP NOT NULL,
ALTER COLUMN "collectionURL" DROP NOT NULL;
