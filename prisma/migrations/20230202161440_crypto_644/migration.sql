/*
  Warnings:

  - You are about to drop the column `payrollDays` on the `Employer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Employer" DROP COLUMN "payrollDays",
ADD COLUMN     "payrollDates" DATE[];
