CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "Job" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID,
    "customerId" UUID NOT NULL,
    "siteId" UUID NOT NULL,
    "quoteId" UUID,
    "jobNumber" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "totalValue" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "depositRequired" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "depositPaid" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "accessNotes" TEXT,
    "workNotes" TEXT,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Job_tenantId_jobNumber_key" ON "Job"("tenantId", "jobNumber");
CREATE INDEX "Job_tenantId_branchId_status_createdAt_idx" ON "Job"("tenantId", "branchId", "status", "createdAt");
CREATE INDEX "Job_tenantId_customerId_createdAt_idx" ON "Job"("tenantId", "customerId", "createdAt");
CREATE INDEX "Job_tenantId_siteId_createdAt_idx" ON "Job"("tenantId", "siteId", "createdAt");
CREATE INDEX "Job_quoteId_idx" ON "Job"("quoteId");

ALTER TABLE "Job" ADD CONSTRAINT "Job_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
