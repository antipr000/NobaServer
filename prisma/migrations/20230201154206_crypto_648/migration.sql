-- CreateTable
CREATE TABLE "TransactionFee" (
    "id" TEXT NOT NULL,
    "transactionID" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionFee_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TransactionFee" ADD CONSTRAINT "TransactionFee_transactionID_fkey" FOREIGN KEY ("transactionID") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
