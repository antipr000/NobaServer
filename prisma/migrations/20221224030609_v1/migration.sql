-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('NOBA_WALLET');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('REFRESH_TOKEN');

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

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Admin_email_idx" ON "Admin"("email");

-- AddForeignKey
ALTER TABLE "LimitConfiguration" ADD CONSTRAINT "LimitConfiguration_profileID_fkey" FOREIGN KEY ("profileID") REFERENCES "LimitProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
