-- AlterTable
ALTER TABLE "Employer" ADD COLUMN     "depositMatchingName" TEXT,
ADD COLUMN     "documentNumber" TEXT;

-- AlterTable
ALTER TABLE "Payroll" ADD COLUMN     "paymentMonoTransactionID" TEXT;
