-- CreateTable
CREATE TABLE "PomeloTransaction" (
    "id" TEXT NOT NULL,
    "pomeloTransactionID" TEXT NOT NULL,
    "nobaTransactionID" TEXT NOT NULL,
    "pomeloCardID" TEXT NOT NULL,
    "amountInUSD" DOUBLE PRECISION NOT NULL,
    "amountInLocalCurrency" DOUBLE PRECISION NOT NULL,
    "localCurrency" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),

    CONSTRAINT "PomeloTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PomeloTransaction_pomeloTransactionID_key" ON "PomeloTransaction"("pomeloTransactionID");

-- CreateIndex
CREATE UNIQUE INDEX "PomeloTransaction_nobaTransactionID_key" ON "PomeloTransaction"("nobaTransactionID");

-- AddForeignKey
ALTER TABLE "PomeloTransaction" ADD CONSTRAINT "PomeloTransaction_pomeloCardID_fkey" FOREIGN KEY ("pomeloCardID") REFERENCES "PomeloCard"("pomeloCardID") ON DELETE CASCADE ON UPDATE CASCADE;
