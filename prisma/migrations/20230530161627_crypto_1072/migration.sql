-- AlterTable
ALTER TABLE "Circle" ADD COLUMN     "currentBalance" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Circle_currentBalance_idx" ON "Circle"("currentBalance");
