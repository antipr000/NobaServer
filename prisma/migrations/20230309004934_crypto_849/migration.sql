/*
  Warnings:

  - You are about to drop the column `reference` on the `Payroll` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Payroll" DROP COLUMN "reference",
ADD COLUMN     "referenceNumber" SERIAL NOT NULL;
