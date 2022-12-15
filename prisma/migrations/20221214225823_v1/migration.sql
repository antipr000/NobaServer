/*
  Warnings:

  - The primary key for the `ACH` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Address` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Card` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `KYC` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Otp` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[otpIdentifier,identityType]` on the table `Otp` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `Otp` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "ACH" DROP CONSTRAINT "ACH_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "ACH_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "ACH_id_seq";

-- AlterTable
ALTER TABLE "Address" DROP CONSTRAINT "Address_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Address_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Address_id_seq";

-- AlterTable
ALTER TABLE "Card" DROP CONSTRAINT "Card_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Card_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Card_id_seq";

-- AlterTable
ALTER TABLE "KYC" DROP CONSTRAINT "KYC_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "KYC_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "KYC_id_seq";

-- AlterTable
ALTER TABLE "Otp" DROP CONSTRAINT "Otp_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "Otp_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "Otp_otpIdentifier_identityType_idx" ON "Otp"("otpIdentifier", "identityType");

-- CreateIndex
CREATE UNIQUE INDEX "Otp_otpIdentifier_identityType_key" ON "Otp"("otpIdentifier", "identityType");
