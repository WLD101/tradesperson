-- CreateEnum
CREATE TYPE "MaterialRequirementStatus" AS ENUM ('PLANNED', 'PARTIALLY_ORDERED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'ALLOCATED', 'CANCELLED');

-- CreateTable
CREATE TABLE "MaterialRequirement" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID,
    "jobId" UUID NOT NULL,
    "sourceQuoteLineId" UUID,
    "sourceEstimateLineId" UUID,
    "productId" UUID,
    "productVariantId" UUID,
    "supplierProductId" UUID,
    "status" "MaterialRequirementStatus" NOT NULL DEFAULT 'PLANNED',
    "description" TEXT NOT NULL,
    "requiredQuantity" DECIMAL(14,4) NOT NULL,
    "orderedQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "receivedQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "allocatedQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "requiredDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialRequirement_tenantId_jobId_sourceQuoteLineId_key" ON "MaterialRequirement"("tenantId", "jobId", "sourceQuoteLineId");

-- CreateIndex
CREATE INDEX "MaterialRequirement_tenantId_jobId_status_idx" ON "MaterialRequirement"("tenantId", "jobId", "status");

-- CreateIndex
CREATE INDEX "MaterialRequirement_tenantId_branchId_status_createdAt_idx" ON "MaterialRequirement"("tenantId", "branchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "MaterialRequirement_tenantId_productId_idx" ON "MaterialRequirement"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "MaterialRequirement_productVariantId_idx" ON "MaterialRequirement"("productVariantId");

-- CreateIndex
CREATE INDEX "MaterialRequirement_supplierProductId_idx" ON "MaterialRequirement"("supplierProductId");

-- CreateIndex
CREATE INDEX "MaterialRequirement_sourceEstimateLineId_idx" ON "MaterialRequirement"("sourceEstimateLineId");

-- AddForeignKey
ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_sourceQuoteLineId_fkey" FOREIGN KEY ("sourceQuoteLineId") REFERENCES "QuoteLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_sourceEstimateLineId_fkey" FOREIGN KEY ("sourceEstimateLineId") REFERENCES "EstimateLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
