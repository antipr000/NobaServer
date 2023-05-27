-- AlterTable
ALTER TABLE "Circle" ADD COLUMN     "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Circle_currentBalance_idx" ON "Circle"("currentBalance");
