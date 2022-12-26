-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "userID" TEXT,
    "transactionID" TEXT,
    "createdTimestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedTimestamp" TIMESTAMP(3),

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Verification_userID_key" ON "Verification"("userID");

-- CreateIndex
CREATE INDEX "Verification_userID_idx" ON "Verification"("userID");
