-- CreateEnum
CREATE TYPE "IdentityType" AS ENUM ('CONSUMER', 'NOBA_ADMIN');

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

-- CreateEnum
CREATE TYPE "KYCProvider" AS ENUM ('SARDINE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('NOBA_WALLET');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('REFRESH_TOKEN');

-- CreateTable
CREATE TABLE "Consumer" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "displayEmail" TEXT,
    "handle" TEXT,
    "referralCode" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfBirth" VARCHAR(10),
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),
    "socialSecurityNumber" TEXT,
    "referredByID" TEXT,

    CONSTRAINT "Consumer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
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
CREATE TABLE "KYC" (
    "id" TEXT NOT NULL,
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
CREATE TABLE "CryptoWallet" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),
    "name" TEXT,
    "chainType" TEXT,
    "isEVMCompatible" BOOLEAN,
    "status" "WalletStatus" NOT NULL DEFAULT 'PENDING',
    "riskScore" DOUBLE PRECISION,
    "consumerID" TEXT NOT NULL,

    CONSTRAINT "CryptoWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "type" "PaymentMethodType" NOT NULL,
    "paymentToken" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),
    "paymentProvider" "PaymentProvider" NOT NULL,
    "status" "PaymentMethodStatus" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "imageUri" TEXT,
    "consumerID" TEXT NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "cardType" TEXT,
    "scheme" TEXT,
    "first6Digits" TEXT NOT NULL,
    "last4Digits" TEXT NOT NULL,
    "authCode" TEXT,
    "authReason" TEXT,
    "paymentMethodID" TEXT NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ACH" (
    "id" TEXT NOT NULL,
    "accountID" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "itemID" TEXT NOT NULL,
    "mask" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "paymentMethodID" TEXT NOT NULL,

    CONSTRAINT "ACH_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "Otp" (
    "id" TEXT NOT NULL,
    "otpIdentifier" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),
    "otp" INTEGER NOT NULL,
    "otpExpirationTimestamp" TIMESTAMP(3) NOT NULL,
    "identityType" "IdentityType" NOT NULL,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LimitProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daily" DOUBLE PRECISION,
    "weekly" DOUBLE PRECISION,
    "monthly" DOUBLE PRECISION NOT NULL,
    "maxTransaction" DOUBLE PRECISION NOT NULL,
    "minTransaction" DOUBLE PRECISION NOT NULL,
    "unsettledExposure" DOUBLE PRECISION,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),

    CONSTRAINT "LimitProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LimitConfiguration" (
    "id" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL,
    "profileID" TEXT NOT NULL,
    "transactionType" "TransactionType",
    "minProfileAge" INTEGER,
    "minBalanceInWallet" DOUBLE PRECISION,
    "minTotalTransactionAmount" DOUBLE PRECISION,
    "paymentMethodType" "PaymentMethodType",
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),

    CONSTRAINT "LimitConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "transactionRef" TEXT NOT NULL,
    "workflowName" TEXT NOT NULL,
    "consumerID" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "exchangeRate" DOUBLE PRECISION,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "tokenType" "TokenType" NOT NULL,
    "expiryTime" TIMESTAMP(3),
    "userID" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "userID" TEXT,
    "transactionID" TEXT,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "Consumer_email_key" ON "Consumer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Consumer_handle_key" ON "Consumer"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "Consumer_referralCode_key" ON "Consumer"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "Consumer_phone_key" ON "Consumer"("phone");

-- CreateIndex
CREATE INDEX "Consumer_email_idx" ON "Consumer"("email");

-- CreateIndex
CREATE INDEX "Consumer_handle_idx" ON "Consumer"("handle");

-- CreateIndex
CREATE INDEX "Consumer_phone_idx" ON "Consumer"("phone");

-- CreateIndex
CREATE INDEX "Consumer_referredByID_idx" ON "Consumer"("referredByID");

-- CreateIndex
CREATE INDEX "Consumer_referralCode_idx" ON "Consumer"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "Address_consumerID_key" ON "Address"("consumerID");

-- CreateIndex
CREATE UNIQUE INDEX "KYC_consumerID_key" ON "KYC"("consumerID");

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
CREATE UNIQUE INDEX "ACH_paymentMethodID_key" ON "ACH"("paymentMethodID");

-- CreateIndex
CREATE UNIQUE INDEX "Circle_walletID_key" ON "Circle"("walletID");

-- CreateIndex
CREATE UNIQUE INDEX "Circle_consumerID_key" ON "Circle"("consumerID");

-- CreateIndex
CREATE INDEX "Circle_consumerID_idx" ON "Circle"("consumerID");

-- CreateIndex
CREATE INDEX "Otp_otpIdentifier_identityType_idx" ON "Otp"("otpIdentifier", "identityType");

-- CreateIndex
CREATE INDEX "Otp_otp_idx" ON "Otp"("otp");

-- CreateIndex
CREATE UNIQUE INDEX "Otp_otpIdentifier_identityType_key" ON "Otp"("otpIdentifier", "identityType");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_transactionRef_key" ON "Transaction"("transactionRef");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Admin_email_idx" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_transactionID_key" ON "Verification"("transactionID");

-- CreateIndex
CREATE INDEX "Verification_userID_idx" ON "Verification"("userID");

-- CreateIndex
CREATE UNIQUE INDEX "CreditCardBIN_bin_key" ON "CreditCardBIN"("bin");

-- CreateIndex
CREATE INDEX "CreditCardBIN_bin_idx" ON "CreditCardBIN"("bin");

-- CreateIndex
CREATE INDEX "CreditCardBIN_supported_idx" ON "CreditCardBIN"("supported");

-- AddForeignKey
ALTER TABLE "Consumer" ADD CONSTRAINT "Consumer_referredByID_fkey" FOREIGN KEY ("referredByID") REFERENCES "Consumer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "LimitConfiguration" ADD CONSTRAINT "LimitConfiguration_profileID_fkey" FOREIGN KEY ("profileID") REFERENCES "LimitProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;