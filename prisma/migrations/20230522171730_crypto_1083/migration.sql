/*
  Warnings:

  - Added the required column `settlementDate` to the `PomeloTransaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PomeloTransaction" ADD COLUMN     "settlementDate" TEXT NOT NULL;
