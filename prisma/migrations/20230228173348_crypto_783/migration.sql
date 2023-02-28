-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "employerID" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "payrollDate" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),
    "completedTimestamp" TIMESTAMP(3),
    "totalDebitAmount" DOUBLE PRECISION,
    "totalCreditAmount" DOUBLE PRECISION,
    "exchangeRate" DOUBLE PRECISION,
    "debitCurrency" TEXT,
    "creditCurrency" TEXT,
    "status" TEXT NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollDisbursement" (
    "id" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),
    "payrollID" TEXT NOT NULL,
    "employeeID" TEXT NOT NULL,
    "transactionID" TEXT,
    "debitAmount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PayrollDisbursement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayrollDisbursement_transactionID_key" ON "PayrollDisbursement"("transactionID");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollDisbursement_payrollID_employeeID_key" ON "PayrollDisbursement"("payrollID", "employeeID");

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_employerID_fkey" FOREIGN KEY ("employerID") REFERENCES "Employer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollDisbursement" ADD CONSTRAINT "PayrollDisbursement_payrollID_fkey" FOREIGN KEY ("payrollID") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollDisbursement" ADD CONSTRAINT "PayrollDisbursement_employeeID_fkey" FOREIGN KEY ("employeeID") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollDisbursement" ADD CONSTRAINT "PayrollDisbursement_transactionID_fkey" FOREIGN KEY ("transactionID") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
