-- CreateTable
CREATE TABLE "PomeloCard" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "pomeloID" TEXT NOT NULL,
    "nobaConsumerID" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),

    CONSTRAINT "PomeloCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PomeloCard_nobaConsumerID_pomeloID_key" ON "PomeloCard"("nobaConsumerID", "pomeloID");

-- AddForeignKey
ALTER TABLE "PomeloCard" ADD CONSTRAINT "PomeloCard_nobaConsumerID_fkey" FOREIGN KEY ("nobaConsumerID") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
