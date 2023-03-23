-- CreateTable
CREATE TABLE "NobaCard" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "consumerID" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),

    CONSTRAINT "NobaCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PomeloCard" (
    "id" TEXT NOT NULL,
    "nobaCardID" TEXT NOT NULL,
    "pomeloCardID" TEXT NOT NULL,
    "pomeloUserID" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),

    CONSTRAINT "PomeloCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PomeloCard_nobaCardID_key" ON "PomeloCard"("nobaCardID");

-- CreateIndex
CREATE UNIQUE INDEX "PomeloCard_pomeloCardID_key" ON "PomeloCard"("pomeloCardID");

-- CreateIndex
CREATE UNIQUE INDEX "PomeloCard_pomeloUserID_pomeloCardID_key" ON "PomeloCard"("pomeloUserID", "pomeloCardID");

-- AddForeignKey
ALTER TABLE "NobaCard" ADD CONSTRAINT "NobaCard_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PomeloCard" ADD CONSTRAINT "PomeloCard_nobaCardID_fkey" FOREIGN KEY ("nobaCardID") REFERENCES "NobaCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
