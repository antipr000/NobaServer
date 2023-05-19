-- CreateTable
CREATE TABLE "ReminderHistory" (
    "id" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),
    "reminderScheduleID" TEXT NOT NULL,
    "consumerID" TEXT NOT NULL,
    "lastSentTimestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderSchedule" (
    "id" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),
    "eventID" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,

    CONSTRAINT "ReminderSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReminderHistory_lastSentTimestamp_idx" ON "ReminderHistory"("lastSentTimestamp");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderHistory_reminderScheduleID_consumerID_key" ON "ReminderHistory"("reminderScheduleID", "consumerID");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderSchedule_eventID_key" ON "ReminderSchedule"("eventID");

-- AddForeignKey
ALTER TABLE "ReminderHistory" ADD CONSTRAINT "ReminderHistory_reminderScheduleID_fkey" FOREIGN KEY ("reminderScheduleID") REFERENCES "ReminderSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderHistory" ADD CONSTRAINT "ReminderHistory_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderSchedule" ADD CONSTRAINT "ReminderSchedule_eventID_fkey" FOREIGN KEY ("eventID") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
