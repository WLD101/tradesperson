ALTER TABLE "Job"
ADD COLUMN "assignedInstallerId" UUID,
ADD COLUMN "installationTeamName" TEXT;

CREATE INDEX "Job_tenantId_branchId_assignedInstallerId_scheduledStart_scheduledEnd_idx"
ON "Job"("tenantId", "branchId", "assignedInstallerId", "scheduledStart", "scheduledEnd");

ALTER TABLE "Job"
ADD CONSTRAINT "Job_assignedInstallerId_fkey"
FOREIGN KEY ("assignedInstallerId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
