-- CreateEnum
CREATE TYPE "KYCStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'FLAGGED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('NOT_REQUIRED', 'REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'REJECTED_DOCUMENT_REQUIRES_RECAPTURE', 'REJECTED_DOCUMENT_POOR_QUALITY', 'REJECTED_DOCUMENT_INVALID_SIZE_OR_TYPE', 'LIVE_PHOTO_VERIFIED');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('PENDING', 'FLAGGED', 'REJECTED', 'APPROVED', 'DELETED');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CARD', 'ACH');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('CHECKOUT');

-- CreateEnum
CREATE TYPE "PaymentMethodStatus" AS ENUM ('FLAGGED', 'REJECTED', 'APPROVED', 'UNSUPPORTED', 'DELETED');

-- CreateTable
CREATE TABLE "Consumer" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "displayEmail" TEXT NOT NULL,
    "handle" TEXT,
    "phone" TEXT,
    "dateOfBirth" VARCHAR(10),
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),
    "socialSecurityNumber" TEXT,

    CONSTRAINT "Consumer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" SERIAL NOT NULL,
    "streetLine1" TEXT NOT NULL,
    "streetLine2" TEXT,
    "city" TEXT NOT NULL,
    "countryCode" VARCHAR(3) NOT NULL,
    "regionCode" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "consumerID" TEXT NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kyc" (
    "id" SERIAL NOT NULL,
    "kycCheckReference" TEXT,
    "documentCheckReference" TEXT,
    "riskRating" TEXT,
    "isSuspectedFraud" BOOLEAN NOT NULL DEFAULT false,
    "kycCheckStatus" "KYCStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "documentVerificationStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'REQUIRED',
    "documentVerificationTimestamp" TIMESTAMP(3) NOT NULL,
    "kycVerificationTimestamp" TIMESTAMP(3) NOT NULL,
    "sanctionLevel" TEXT,
    "riskLevel" TEXT,
    "consumerID" TEXT NOT NULL,

    CONSTRAINT "Kyc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoWallet" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chainType" TEXT,
    "isEVMCompatible" BOOLEAN,
    "status" "WalletStatus" NOT NULL DEFAULT 'PENDING',
    "riskScore" DECIMAL(65,30),
    "consumerID" TEXT NOT NULL,

    CONSTRAINT "CryptoWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "type" "PaymentMethodType" NOT NULL,
    "paymentToken" TEXT NOT NULL,
    "paymentProvider" "PaymentProvider" NOT NULL,
    "status" "PaymentMethodStatus" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "imageUri" TEXT,
    "consumerID" TEXT NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" SERIAL NOT NULL,
    "cardType" TEXT,
    "scheme" TEXT,
    "first6Digits" TEXT NOT NULL,
    "last4Digits" TEXT NOT NULL,
    "authCode" TEXT,
    "authReason" TEXT,
    "paymentMethodID" INTEGER NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AchData" (
    "id" SERIAL NOT NULL,
    "accountID" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "itemID" TEXT NOT NULL,
    "mask" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "paymentMethodID" INTEGER NOT NULL,

    CONSTRAINT "AchData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Circle" (
    "id" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),
    "walletID" TEXT NOT NULL,
    "consumerID" TEXT NOT NULL,

    CONSTRAINT "Circle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Consumer_email_key" ON "Consumer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Consumer_handle_key" ON "Consumer"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "Consumer_phone_key" ON "Consumer"("phone");

-- CreateIndex
CREATE INDEX "Consumer_email_idx" ON "Consumer"("email");

-- CreateIndex
CREATE INDEX "Consumer_handle_idx" ON "Consumer"("handle");

-- CreateIndex
CREATE INDEX "Consumer_phone_idx" ON "Consumer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Address_consumerID_key" ON "Address"("consumerID");

-- CreateIndex
CREATE UNIQUE INDEX "Kyc_consumerID_key" ON "Kyc"("consumerID");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoWallet_address_key" ON "CryptoWallet"("address");

-- CreateIndex
CREATE INDEX "CryptoWallet_address_idx" ON "CryptoWallet"("address");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_paymentToken_key" ON "PaymentMethod"("paymentToken");

-- CreateIndex
CREATE INDEX "PaymentMethod_paymentToken_idx" ON "PaymentMethod"("paymentToken");

-- CreateIndex
CREATE UNIQUE INDEX "Card_paymentMethodID_key" ON "Card"("paymentMethodID");

-- CreateIndex
CREATE UNIQUE INDEX "AchData_paymentMethodID_key" ON "AchData"("paymentMethodID");

-- CreateIndex
CREATE UNIQUE INDEX "Circle_walletID_key" ON "Circle"("walletID");

-- CreateIndex
CREATE UNIQUE INDEX "Circle_consumerID_key" ON "Circle"("consumerID");

-- CreateIndex
CREATE INDEX "Circle_consumerID_idx" ON "Circle"("consumerID");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kyc" ADD CONSTRAINT "Kyc_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoWallet" ADD CONSTRAINT "CryptoWallet_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_paymentMethodID_fkey" FOREIGN KEY ("paymentMethodID") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchData" ADD CONSTRAINT "AchData_paymentMethodID_fkey" FOREIGN KEY ("paymentMethodID") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Circle" ADD CONSTRAINT "Circle_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
