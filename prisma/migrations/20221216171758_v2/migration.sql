/*
  Warnings:

  - You are about to alter the column `riskScore` on the `CryptoWallet` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.

*/
-- DropForeignKey
ALTER TABLE "ACH" DROP CONSTRAINT "ACH_paymentMethodID_fkey";

-- DropForeignKey
ALTER TABLE "Address" DROP CONSTRAINT "Address_consumerID_fkey";

-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_paymentMethodID_fkey";

-- DropForeignKey
ALTER TABLE "Circle" DROP CONSTRAINT "Circle_consumerID_fkey";

-- DropForeignKey
ALTER TABLE "CryptoWallet" DROP CONSTRAINT "CryptoWallet_consumerID_fkey";

-- DropForeignKey
ALTER TABLE "KYC" DROP CONSTRAINT "KYC_consumerID_fkey";

-- DropForeignKey
ALTER TABLE "PaymentMethod" DROP CONSTRAINT "PaymentMethod_consumerID_fkey";

-- AlterTable
ALTER TABLE "CryptoWallet" ALTER COLUMN "riskScore" SET DATA TYPE DOUBLE PRECISION;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KYC" ADD CONSTRAINT "KYC_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoWallet" ADD CONSTRAINT "CryptoWallet_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_paymentMethodID_fkey" FOREIGN KEY ("paymentMethodID") REFERENCES "PaymentMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ACH" ADD CONSTRAINT "ACH_paymentMethodID_fkey" FOREIGN KEY ("paymentMethodID") REFERENCES "PaymentMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Circle" ADD CONSTRAINT "Circle_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
