-- CreateTable
CREATE TABLE "TransactionEvent" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "transactionID" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT NOT NULL,
    "details" TEXT,
    "key" TEXT,
    "param1" TEXT,
    "param2" TEXT,
    "param3" TEXT,
    "param4" TEXT,
    "param5" TEXT,

    CONSTRAINT "TransactionEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TransactionEvent" ADD CONSTRAINT "TransactionEvent_transactionID_fkey" FOREIGN KEY ("transactionID") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
