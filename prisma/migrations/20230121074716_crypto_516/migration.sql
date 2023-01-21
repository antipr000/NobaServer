-- CreateTable
CREATE TABLE "Employer" (
    "id" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "logoURI" TEXT NOT NULL,
    "referralID" TEXT NOT NULL,
    "bubbleID" TEXT NOT NULL,

    CONSTRAINT "Employer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),
    "allocationAmount" DOUBLE PRECISION NOT NULL,
    "allocationCurrency" TEXT NOT NULL,
    "employerID" TEXT NOT NULL,
    "consumerID" TEXT NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employer_referralID_key" ON "Employer"("referralID");

-- CreateIndex
CREATE UNIQUE INDEX "Employer_bubbleID_key" ON "Employer"("bubbleID");

-- CreateIndex
CREATE INDEX "Employer_referralID_idx" ON "Employer"("referralID");

-- CreateIndex
CREATE INDEX "Employee_consumerID_idx" ON "Employee"("consumerID");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_consumerID_employerID_key" ON "Employee"("consumerID", "employerID");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_employerID_fkey" FOREIGN KEY ("employerID") REFERENCES "Employer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_consumerID_fkey" FOREIGN KEY ("consumerID") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
