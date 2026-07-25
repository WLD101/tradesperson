-- AlterTable
ALTER TABLE "Job" ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "completedById" UUID,
ADD COLUMN "completionNotes" TEXT,
ADD COLUMN "customerSignoffName" TEXT;
