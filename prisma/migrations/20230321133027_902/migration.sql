-- CreateTable
CREATE TABLE "PomeloUser" (
    "id" TEXT NOT NULL,
    "consumerID" TEXT NOT NULL,
    "pomeloID" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),

    CONSTRAINT "PomeloUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PomeloUser_consumerID_key" ON "PomeloUser"("consumerID");

-- CreateIndex
CREATE UNIQUE INDEX "PomeloUser_pomeloID_key" ON "PomeloUser"("pomeloID");

-- AddForeignKey
ALTER TABLE "PomeloUser" ADD CONSTRAINT "PomeloUser_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
