-- CreateTable
CREATE TABLE "Pushtoken" (
    "id" TEXT NOT NULL,
    "consumerID" TEXT NOT NULL,
    "pushtoken" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),

    CONSTRAINT "Pushtoken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pushtoken_pushtoken_key" ON "Pushtoken"("pushtoken");

-- CreateIndex
CREATE INDEX "Pushtoken_consumerID_pushtoken_idx" ON "Pushtoken"("consumerID", "pushtoken");

-- AddForeignKey
ALTER TABLE "Pushtoken" ADD CONSTRAINT "Pushtoken_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
