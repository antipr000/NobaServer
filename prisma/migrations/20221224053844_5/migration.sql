-- CreateTable
CREATE TABLE "CreditCardBIN" (
    "id" TEXT NOT NULL,
    "issuer" TEXT,
    "bin" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "mask" TEXT,
    "supported" TEXT NOT NULL,
    "digits" INTEGER NOT NULL,
    "cvvDigits" INTEGER NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),

    CONSTRAINT "CreditCardBIN_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditCardBIN_bin_key" ON "CreditCardBIN"("bin");

-- CreateIndex
CREATE INDEX "CreditCardBIN_bin_idx" ON "CreditCardBIN"("bin");

-- CreateIndex
CREATE INDEX "CreditCardBIN_supported_idx" ON "CreditCardBIN"("supported");
