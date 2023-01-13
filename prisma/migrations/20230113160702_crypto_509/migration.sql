-- CreateTable
CREATE TABLE "Mono" (
    "id" TEXT NOT NULL,
    "monoTransactionID" TEXT,
    "collectionLinkID" TEXT NOT NULL,
    "collectionUrl" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "nobaTransactionID" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),

    CONSTRAINT "Mono_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mono_collectionLinkID_key" ON "Mono"("collectionLinkID");

-- CreateIndex
CREATE UNIQUE INDEX "Mono_nobaTransactionID_key" ON "Mono"("nobaTransactionID");

-- CreateIndex
CREATE INDEX "Mono_nobaTransactionID_idx" ON "Mono"("nobaTransactionID");

-- CreateIndex
CREATE INDEX "Mono_monoTransactionID_idx" ON "Mono"("monoTransactionID");

-- AddForeignKey
ALTER TABLE "Mono" ADD CONSTRAINT "Mono_nobaTransactionID_fkey" FOREIGN KEY ("nobaTransactionID") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
