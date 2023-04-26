ALTER TABLE "Employee" ADD COLUMN "email" TEXT,
ADD COLUMN "lastInviteSentTimestamp" TIMESTAMP(3),
ADD COLUMN "status" TEXT,
ALTER COLUMN "consumerID" DROP NOT NULL;

-- Update existing data in the `status` column if needed
UPDATE "Employee" SET "status" = 'LINKED' WHERE "status" IS NULL;

-- Alter the `status` column to be `NOT NULL`
ALTER TABLE "Employee" ALTER COLUMN "status" SET NOT NULL;