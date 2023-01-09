-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),
    "numeratorCurrency" VARCHAR(3) NOT NULL,
    "denominatorCurrency" VARCHAR(3) NOT NULL,
    "bankRate" DOUBLE PRECISION NOT NULL,
    "nobaRate" DOUBLE PRECISION NOT NULL,
    "expirationTimestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExchangeRate_numeratorCurrency_denominatorCurrency_idx" ON "ExchangeRate"("numeratorCurrency", "denominatorCurrency");
