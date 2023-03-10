/*
  Warnings:

  - You are about to drop the column `debitAmount` on the `PayrollDisbursement` table. All the data in the column will be lost.
  - Added the required column `allocationAmount` to the `PayrollDisbursement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PayrollDisbursement" ADD COLUMN  "allocationAmount" DOUBLE PRECISION;

UPDATE "PayrollDisbursement" SET "allocationAmount" = "debitAmount";

ALTER TABLE "PayrollDisbursement" ALTER COLUMN "allocationAmount" SET NOT NULL;
ALTER TABLE "PayrollDisbursement" DROP COLUMN "debitAmount";