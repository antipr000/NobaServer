-- CreateTable
CREATE TABLE "Identification" (
    "id" TEXT NOT NULL,
    "consumerID" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),

    CONSTRAINT "Identification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Identification_consumerID_type_key" ON "Identification"("consumerID", "type");

-- AddForeignKey
ALTER TABLE "Identification" ADD CONSTRAINT "Identification_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
