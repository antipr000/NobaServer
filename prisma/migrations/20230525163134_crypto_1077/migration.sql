/*
  Warnings:

  - Added the required column `eventID` to the `ReminderHistory` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ReminderHistory_lastSentTimestamp_idx";

-- AlterTable
ALTER TABLE "ReminderHistory" ADD COLUMN     "eventID" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Consumer_createdTimestamp_idx" ON "Consumer"("createdTimestamp");

-- CreateIndex
CREATE INDEX "ExchangeRate_createdTimestamp_idx" ON "ExchangeRate"("createdTimestamp");

-- CreateIndex
CREATE INDEX "ReminderHistory_eventID_lastSentTimestamp_idx" ON "ReminderHistory"("eventID", "lastSentTimestamp");

-- AddForeignKey
ALTER TABLE "ReminderHistory" ADD CONSTRAINT "ReminderHistory_eventID_fkey" FOREIGN KEY ("eventID") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
