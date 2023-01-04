-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "debitCurrency" DROP NOT NULL,
ALTER COLUMN "creditCurrency" DROP NOT NULL;
