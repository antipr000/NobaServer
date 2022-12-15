/*
  Warnings:

  - The primary key for the `CryptoWallet` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Otp` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `consumerID` on the `Otp` table. All the data in the column will be lost.
  - You are about to drop the column `emailOrPhone` on the `Otp` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `Otp` table. All the data in the column will be lost.
  - The primary key for the `PaymentMethod` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `AchData` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Kyc` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `otpIdentifier` to the `Otp` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "KYCProvider" AS ENUM ('SARDINE');

-- DropForeignKey
ALTER TABLE "AchData" DROP CONSTRAINT "AchData_paymentMethodID_fkey";

-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_paymentMethodID_fkey";

-- DropForeignKey
ALTER TABLE "Kyc" DROP CONSTRAINT "Kyc_consumerID_fkey";

-- DropForeignKey
ALTER TABLE "Otp" DROP CONSTRAINT "Otp_consumerID_fkey";

-- DropIndex
DROP INDEX "Otp_consumerID_key";

-- AlterTable
ALTER TABLE "Card" ALTER COLUMN "paymentMethodID" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "CryptoWallet" DROP CONSTRAINT "CryptoWallet_pkey",
ADD COLUMN     "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedTimestamp" TIMESTAMP(3),
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "name" DROP NOT NULL,
ADD CONSTRAINT "CryptoWallet_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "CryptoWallet_id_seq";

-- AlterTable
ALTER TABLE "Otp" DROP CONSTRAINT "Otp_pkey",
DROP COLUMN "consumerID",
DROP COLUMN "emailOrPhone",
DROP COLUMN "id",
ADD COLUMN     "otpIdentifier" TEXT NOT NULL,
ADD CONSTRAINT "Otp_pkey" PRIMARY KEY ("otpIdentifier", "identityType");

-- AlterTable
ALTER TABLE "PaymentMethod" DROP CONSTRAINT "PaymentMethod_pkey",
ADD COLUMN     "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedTimestamp" TIMESTAMP(3),
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "PaymentMethod_id_seq";

-- DropTable
DROP TABLE "AchData";

-- DropTable
DROP TABLE "Kyc";

-- CreateTable
CREATE TABLE "KYC" (
    "id" SERIAL NOT NULL,
    "kycCheckReference" TEXT,
    "documentCheckReference" TEXT,
    "provider" "KYCProvider" NOT NULL DEFAULT 'SARDINE',
    "riskRating" TEXT,
    "isSuspectedFraud" BOOLEAN NOT NULL DEFAULT false,
    "kycCheckStatus" "KYCStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "documentVerificationStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'REQUIRED',
    "documentVerificationTimestamp" TIMESTAMP(3),
    "kycVerificationTimestamp" TIMESTAMP(3),
    "sanctionLevel" TEXT,
    "riskLevel" TEXT,
    "consumerID" TEXT NOT NULL,

    CONSTRAINT "KYC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ACH" (
    "id" SERIAL NOT NULL,
    "accountID" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "itemID" TEXT NOT NULL,
    "mask" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "paymentMethodID" TEXT NOT NULL,

    CONSTRAINT "ACH_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KYC_consumerID_key" ON "KYC"("consumerID");

-- CreateIndex
CREATE UNIQUE INDEX "ACH_paymentMethodID_key" ON "ACH"("paymentMethodID");

-- AddForeignKey
ALTER TABLE "KYC" ADD CONSTRAINT "KYC_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_paymentMethodID_fkey" FOREIGN KEY ("paymentMethodID") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ACH" ADD CONSTRAINT "ACH_paymentMethodID_fkey" FOREIGN KEY ("paymentMethodID") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
