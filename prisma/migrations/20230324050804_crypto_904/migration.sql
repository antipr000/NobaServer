/*
  Warnings:

  - Added the required column `last4Digits` to the `NobaCard` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "NobaCard" ADD COLUMN     "last4Digits" TEXT NOT NULL;
