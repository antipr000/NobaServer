-- AlterTable
ALTER TABLE "Employer" ADD COLUMN     "locale" TEXT;
UPDATE "Employer" SET "locale"='es_co';
