CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT', 'CALCULATED', 'READY_FOR_QUOTE', 'QUOTED', 'ACCEPTED', 'REJECTED', 'CANCELLED');
CREATE TYPE "EstimateLineType" AS ENUM ('MATERIAL', 'LABOUR', 'ACCESSORY', 'SERVICE', 'DISCOUNT');
CREATE TYPE "EstimateVersionStatus" AS ENUM ('DRAFT', 'CALCULATED', 'READY_FOR_QUOTE', 'QUOTED', 'ARCHIVED');

CREATE TABLE "Estimate" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID,
    "customerId" UUID NOT NULL,
    "siteId" UUID NOT NULL,
    "surveyId" UUID,
    "estimateNumber" TEXT NOT NULL,
    "status" "EstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "subtotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "materialCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "labourCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "accessoryCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "supplierCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "marginAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "vatRate" DECIMAL(8,4) NOT NULL DEFAULT 0.2,
    "vatAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "grossProfit" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "grossMarginPercent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "internalNotes" TEXT,
    "customerNotes" TEXT,
    "createdById" UUID,
    "updatedById" UUID,
    "approvedById" UUID,
    "rejectedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estimate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EstimateRoom" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "estimateId" UUID NOT NULL,
    "surveyRoomId" UUID,
    "roomName" TEXT NOT NULL,
    "grossArea" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "deductionArea" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "netArea" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "wastePercent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "requiredArea" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "perimeter" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstimateRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EstimateLine" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "estimateId" UUID NOT NULL,
    "estimateRoomId" UUID,
    "lineType" "EstimateLineType" NOT NULL DEFAULT 'MATERIAL',
    "productId" UUID,
    "productVariantId" UUID,
    "supplierProductId" UUID,
    "supplierProductPriceId" UUID,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "unitSellPrice" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "costTotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "sellTotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "marginAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "marginPercent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "vatRate" DECIMAL(8,4) NOT NULL DEFAULT 0.2,
    "vatAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "priceSnapshot" JSONB,
    "overrideReason" TEXT,
    "overrideActorUserId" UUID,
    "overrideAt" TIMESTAMP(3),
    "notes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstimateLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EstimateVersion" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "estimateId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "EstimateVersionStatus" NOT NULL DEFAULT 'CALCULATED',
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "subtotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "materialCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "labourCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "accessoryCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "supplierCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "marginAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "vatRate" DECIMAL(8,4) NOT NULL DEFAULT 0.2,
    "vatAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "grossProfit" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "grossMarginPercent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "snapshot" JSONB NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimateVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Estimate_tenantId_estimateNumber_key" ON "Estimate"("tenantId", "estimateNumber");
CREATE INDEX "Estimate_tenantId_branchId_status_createdAt_idx" ON "Estimate"("tenantId", "branchId", "status", "createdAt");
CREATE INDEX "Estimate_tenantId_customerId_createdAt_idx" ON "Estimate"("tenantId", "customerId", "createdAt");
CREATE INDEX "Estimate_tenantId_siteId_createdAt_idx" ON "Estimate"("tenantId", "siteId", "createdAt");
CREATE INDEX "Estimate_surveyId_idx" ON "Estimate"("surveyId");
CREATE INDEX "EstimateRoom_tenantId_estimateId_displayOrder_idx" ON "EstimateRoom"("tenantId", "estimateId", "displayOrder");
CREATE INDEX "EstimateRoom_surveyRoomId_idx" ON "EstimateRoom"("surveyRoomId");
CREATE INDEX "EstimateLine_tenantId_estimateId_displayOrder_idx" ON "EstimateLine"("tenantId", "estimateId", "displayOrder");
CREATE INDEX "EstimateLine_estimateRoomId_idx" ON "EstimateLine"("estimateRoomId");
CREATE INDEX "EstimateLine_tenantId_productId_idx" ON "EstimateLine"("tenantId", "productId");
CREATE INDEX "EstimateLine_productVariantId_idx" ON "EstimateLine"("productVariantId");
CREATE INDEX "EstimateLine_supplierProductId_idx" ON "EstimateLine"("supplierProductId");
CREATE INDEX "EstimateLine_supplierProductPriceId_idx" ON "EstimateLine"("supplierProductPriceId");
CREATE UNIQUE INDEX "EstimateVersion_tenantId_estimateId_versionNumber_key" ON "EstimateVersion"("tenantId", "estimateId", "versionNumber");
CREATE INDEX "EstimateVersion_tenantId_status_createdAt_idx" ON "EstimateVersion"("tenantId", "status", "createdAt");
CREATE INDEX "EstimateVersion_tenantId_estimateId_versionNumber_idx" ON "EstimateVersion"("tenantId", "estimateId", "versionNumber");

ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EstimateRoom" ADD CONSTRAINT "EstimateRoom_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EstimateRoom" ADD CONSTRAINT "EstimateRoom_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EstimateRoom" ADD CONSTRAINT "EstimateRoom_surveyRoomId_fkey" FOREIGN KEY ("surveyRoomId") REFERENCES "SurveyRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EstimateLine" ADD CONSTRAINT "EstimateLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EstimateLine" ADD CONSTRAINT "EstimateLine_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EstimateLine" ADD CONSTRAINT "EstimateLine_estimateRoomId_fkey" FOREIGN KEY ("estimateRoomId") REFERENCES "EstimateRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EstimateLine" ADD CONSTRAINT "EstimateLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EstimateLine" ADD CONSTRAINT "EstimateLine_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EstimateLine" ADD CONSTRAINT "EstimateLine_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EstimateLine" ADD CONSTRAINT "EstimateLine_supplierProductPriceId_fkey" FOREIGN KEY ("supplierProductPriceId") REFERENCES "SupplierProductPrice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EstimateVersion" ADD CONSTRAINT "EstimateVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EstimateVersion" ADD CONSTRAINT "EstimateVersion_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
