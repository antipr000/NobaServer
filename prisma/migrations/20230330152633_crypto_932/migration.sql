-- CreateTable
CREATE TABLE "ConsumerConfiguration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3) NOT NULL,
    "consumerID" TEXT NOT NULL,

    CONSTRAINT "ConsumerConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsumerConfiguration_consumerID_idx" ON "ConsumerConfiguration"("consumerID");

-- AddForeignKey
ALTER TABLE "ConsumerConfiguration" ADD CONSTRAINT "ConsumerConfiguration_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
