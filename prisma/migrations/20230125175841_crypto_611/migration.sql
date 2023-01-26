-- CreateTable
CREATE TABLE "WithdrawalDetails" (
    "id" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "transactionID" TEXT NOT NULL,

    CONSTRAINT "WithdrawalDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalDetails_transactionID_key" ON "WithdrawalDetails"("transactionID");

-- CreateIndex
CREATE INDEX "WithdrawalDetails_transactionID_idx" ON "WithdrawalDetails"("transactionID");

-- AddForeignKey
ALTER TABLE "WithdrawalDetails" ADD CONSTRAINT "WithdrawalDetails_transactionID_fkey" FOREIGN KEY ("transactionID") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
