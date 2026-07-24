-- AlterEnum
ALTER TYPE "MaterialRequirementStatus" ADD VALUE 'PARTIALLY_REQUISITIONED';
ALTER TYPE "MaterialRequirementStatus" ADD VALUE 'REQUISITIONED';

-- AlterTable
ALTER TABLE "MaterialRequirement" ADD COLUMN "requisitionedQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
ADD COLUMN "purchaseRequisitionLineId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "MaterialRequirement_purchaseRequisitionLineId_key" ON "MaterialRequirement"("purchaseRequisitionLineId");

-- CreateIndex
CREATE INDEX "MaterialRequirement_purchaseRequisitionLineId_idx" ON "MaterialRequirement"("purchaseRequisitionLineId");

-- AddForeignKey
ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_purchaseRequisitionLineId_fkey" FOREIGN KEY ("purchaseRequisitionLineId") REFERENCES "PurchaseRequisitionLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
