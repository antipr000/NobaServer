/*
  Warnings:

  - A unique constraint covering the columns `[consumerID,type,countryCode]` on the table `Identification` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `countryCode` to the `Identification` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Identification_consumerID_type_key";

-- AlterTable
ALTER TABLE "Identification" ADD COLUMN     "countryCode" VARCHAR(2) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Identification_consumerID_type_countryCode_key" ON "Identification"("consumerID", "type", "countryCode");
