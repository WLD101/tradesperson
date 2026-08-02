-- AlterTable
ALTER TABLE "Tenant" ALTER COLUMN "activeIndustries" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "Job_tenantId_branchId_assignedInstallerId_scheduledStart_schedu" RENAME TO "Job_tenantId_branchId_assignedInstallerId_scheduledStart_sc_idx";
