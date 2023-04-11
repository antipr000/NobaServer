-- AlterTable
ALTER TABLE "PomeloTransaction" ADD COLUMN     "parentPomeloTransactionID" TEXT;

-- AddForeignKey
ALTER TABLE "PomeloTransaction" ADD CONSTRAINT "PomeloTransaction_parentPomeloTransactionID_fkey" FOREIGN KEY ("parentPomeloTransactionID") REFERENCES "PomeloTransaction"("pomeloTransactionID") ON DELETE CASCADE ON UPDATE CASCADE;
