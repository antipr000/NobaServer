/*
  Warnings:

  - Added the required column `countryCode` to the `Identification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Identification" ADD COLUMN     "countryCode" VARCHAR(2) NOT NULL;
