/*
  Warnings:

  - Added the required column `eventID` to the `ReminderHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ReminderHistory" ADD COLUMN     "eventID" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "ReminderHistory" ADD CONSTRAINT "ReminderHistory_eventID_fkey" FOREIGN KEY ("eventID") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
