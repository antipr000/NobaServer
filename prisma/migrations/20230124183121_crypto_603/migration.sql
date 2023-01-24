/*
  Warnings:

  - Added the required column `leadDays` to the `Employer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Employer" ADD COLUMN     "leadDays" INTEGER NOT NULL,
ADD COLUMN     "payrollDays" INTEGER[];
