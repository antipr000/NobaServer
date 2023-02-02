-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL,
    "consumerID" TEXT NOT NULL,
    "pushToken" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_consumerID_pushToken_key" ON "PushToken"("consumerID", "pushToken");

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
