/*
  Warnings:

  - Added the required column `sessionKey` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "memo" TEXT,
ADD COLUMN     "sessionKey" TEXT NOT NULL;
