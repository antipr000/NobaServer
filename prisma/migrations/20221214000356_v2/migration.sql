-- CreateEnum
CREATE TYPE "IdentityType" AS ENUM ('CONSUMER', 'NOBA_ADMIN');

-- CreateTable
CREATE TABLE "Otp" (
    "id" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),
    "emailOrPhone" TEXT NOT NULL,
    "otp" INTEGER NOT NULL,
    "otpExpirationTimestamp" TIMESTAMP(3) NOT NULL,
    "identityType" "IdentityType" NOT NULL,
    "consumerID" TEXT,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Otp_consumerID_key" ON "Otp"("consumerID");

-- CreateIndex
CREATE INDEX "Otp_otp_idx" ON "Otp"("otp");

-- AddForeignKey
ALTER TABLE "Otp" ADD CONSTRAINT "Otp_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
