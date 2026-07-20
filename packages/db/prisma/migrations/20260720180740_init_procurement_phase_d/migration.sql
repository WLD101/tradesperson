-- CreateEnum
CREATE TYPE "PurchaseRequisitionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PARTIALLY_ORDERED', 'ORDERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ISSUED', 'ACKNOWLEDGED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PurchaseOrderVersionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ISSUED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierAcknowledgementStatus" AS ENUM ('PENDING', 'ACCEPTED', 'ACCEPTED_WITH_CHANGES', 'REJECTED');

-- CreateEnum
CREATE TYPE "PurchaseOrderDeliveryPlanStatus" AS ENUM ('PLANNED', 'CONFIRMED', 'DELAYED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "PurchaseRequisition" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "requisitionNumber" TEXT NOT NULL,
    "status" "PurchaseRequisitionStatus" NOT NULL DEFAULT 'DRAFT',
    "requestedById" UUID,
    "approvedById" UUID,
    "requiredDate" TIMESTAMP(3),
    "purpose" TEXT,
    "internalNotes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequisitionLine" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "purchaseRequisitionId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "productVariantId" UUID,
    "supplierProductId" UUID,
    "preferredSupplierId" UUID,
    "description" TEXT NOT NULL,
    "requestedQuantity" DECIMAL(14,4) NOT NULL,
    "orderedQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "estimatedUnitCost" DECIMAL(14,4),
    "estimatedTotal" DECIMAL(14,4),
    "requiredDate" TIMESTAMP(3),
    "notes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequisitionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "purchaseRequisitionId" UUID,
    "purchaseOrderNumber" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL,
    "subtotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "deliveryAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "requiredDate" TIMESTAMP(3),
    "expectedDate" TIMESTAMP(3),
    "deliveryAddress" TEXT,
    "supplierReference" TEXT,
    "internalNotes" TEXT,
    "createdById" UUID,
    "approvedById" UUID,
    "issuedById" UUID,
    "cancelledById" UUID,
    "approvedAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderVersion" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "PurchaseOrderVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL,
    "subtotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "deliveryAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "requiredDate" TIMESTAMP(3),
    "expectedDate" TIMESTAMP(3),
    "deliveryAddress" TEXT,
    "supplierReference" TEXT,
    "terms" TEXT,
    "notes" TEXT,
    "createdById" UUID,
    "approvedById" UUID,
    "issuedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "purchaseOrderVersionId" UUID NOT NULL,
    "purchaseRequisitionLineId" UUID,
    "productId" UUID NOT NULL,
    "productVariantId" UUID,
    "supplierProductId" UUID,
    "supplierSku" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitCost" DECIMAL(14,4) NOT NULL,
    "lineSubtotal" DECIMAL(14,4) NOT NULL,
    "taxRate" DECIMAL(8,4),
    "taxAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(14,4) NOT NULL,
    "requiredDate" TIMESTAMP(3),
    "expectedDate" TIMESTAMP(3),
    "notes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "priceSnapshot" JSONB,
    "overrideReason" TEXT,
    "overrideActorUserId" UUID,
    "overrideAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierAcknowledgement" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "purchaseOrderVersionId" UUID,
    "status" "SupplierAcknowledgementStatus" NOT NULL DEFAULT 'PENDING',
    "supplierReference" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "expectedDeliveryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderDeliveryPlan" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "purchaseOrderVersionId" UUID,
    "expectedDate" TIMESTAMP(3),
    "deliveryAddress" TEXT,
    "status" "PurchaseOrderDeliveryPlanStatus" NOT NULL DEFAULT 'PLANNED',
    "supplierReference" TEXT,
    "notes" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderDeliveryPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseRequisition_tenantId_branchId_status_createdAt_idx" ON "PurchaseRequisition"("tenantId", "branchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseRequisition_tenantId_requiredDate_idx" ON "PurchaseRequisition"("tenantId", "requiredDate");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequisition_tenantId_requisitionNumber_key" ON "PurchaseRequisition"("tenantId", "requisitionNumber");

-- CreateIndex
CREATE INDEX "PurchaseRequisitionLine_tenantId_purchaseRequisitionId_disp_idx" ON "PurchaseRequisitionLine"("tenantId", "purchaseRequisitionId", "displayOrder");

-- CreateIndex
CREATE INDEX "PurchaseRequisitionLine_tenantId_productId_idx" ON "PurchaseRequisitionLine"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "PurchaseRequisitionLine_productVariantId_idx" ON "PurchaseRequisitionLine"("productVariantId");

-- CreateIndex
CREATE INDEX "PurchaseRequisitionLine_supplierProductId_idx" ON "PurchaseRequisitionLine"("supplierProductId");

-- CreateIndex
CREATE INDEX "PurchaseRequisitionLine_preferredSupplierId_idx" ON "PurchaseRequisitionLine"("preferredSupplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_branchId_status_createdAt_idx" ON "PurchaseOrder"("tenantId", "branchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_supplierId_status_idx" ON "PurchaseOrder"("tenantId", "supplierId", "status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_purchaseRequisitionId_idx" ON "PurchaseOrder"("purchaseRequisitionId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_tenantId_purchaseOrderNumber_key" ON "PurchaseOrder"("tenantId", "purchaseOrderNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderVersion_tenantId_status_createdAt_idx" ON "PurchaseOrderVersion"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseOrderVersion_tenantId_purchaseOrderId_versionNumber_idx" ON "PurchaseOrderVersion"("tenantId", "purchaseOrderId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderVersion_tenantId_purchaseOrderId_versionNumber_key" ON "PurchaseOrderVersion"("tenantId", "purchaseOrderId", "versionNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_tenantId_purchaseOrderVersionId_displayOr_idx" ON "PurchaseOrderLine"("tenantId", "purchaseOrderVersionId", "displayOrder");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_purchaseRequisitionLineId_idx" ON "PurchaseOrderLine"("purchaseRequisitionLineId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_tenantId_productId_idx" ON "PurchaseOrderLine"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_productVariantId_idx" ON "PurchaseOrderLine"("productVariantId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_supplierProductId_idx" ON "PurchaseOrderLine"("supplierProductId");

-- CreateIndex
CREATE INDEX "SupplierAcknowledgement_tenantId_purchaseOrderId_createdAt_idx" ON "SupplierAcknowledgement"("tenantId", "purchaseOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "SupplierAcknowledgement_purchaseOrderVersionId_idx" ON "SupplierAcknowledgement"("purchaseOrderVersionId");

-- CreateIndex
CREATE INDEX "PurchaseOrderDeliveryPlan_tenantId_purchaseOrderId_expected_idx" ON "PurchaseOrderDeliveryPlan"("tenantId", "purchaseOrderId", "expectedDate");

-- CreateIndex
CREATE INDEX "PurchaseOrderDeliveryPlan_purchaseOrderVersionId_idx" ON "PurchaseOrderDeliveryPlan"("purchaseOrderVersionId");

-- CreateIndex
CREATE INDEX "SupplierPriceListVersion_sourceImportId_idx" ON "SupplierPriceListVersion"("sourceImportId");

-- AddForeignKey
ALTER TABLE "PurchaseRequisition" ADD CONSTRAINT "PurchaseRequisition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequisition" ADD CONSTRAINT "PurchaseRequisition_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequisitionLine" ADD CONSTRAINT "PurchaseRequisitionLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequisitionLine" ADD CONSTRAINT "PurchaseRequisitionLine_purchaseRequisitionId_fkey" FOREIGN KEY ("purchaseRequisitionId") REFERENCES "PurchaseRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequisitionLine" ADD CONSTRAINT "PurchaseRequisitionLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequisitionLine" ADD CONSTRAINT "PurchaseRequisitionLine_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequisitionLine" ADD CONSTRAINT "PurchaseRequisitionLine_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequisitionLine" ADD CONSTRAINT "PurchaseRequisitionLine_preferredSupplierId_fkey" FOREIGN KEY ("preferredSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_purchaseRequisitionId_fkey" FOREIGN KEY ("purchaseRequisitionId") REFERENCES "PurchaseRequisition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderVersion" ADD CONSTRAINT "PurchaseOrderVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderVersion" ADD CONSTRAINT "PurchaseOrderVersion_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderVersionId_fkey" FOREIGN KEY ("purchaseOrderVersionId") REFERENCES "PurchaseOrderVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseRequisitionLineId_fkey" FOREIGN KEY ("purchaseRequisitionLineId") REFERENCES "PurchaseRequisitionLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierAcknowledgement" ADD CONSTRAINT "SupplierAcknowledgement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierAcknowledgement" ADD CONSTRAINT "SupplierAcknowledgement_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierAcknowledgement" ADD CONSTRAINT "SupplierAcknowledgement_purchaseOrderVersionId_fkey" FOREIGN KEY ("purchaseOrderVersionId") REFERENCES "PurchaseOrderVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderDeliveryPlan" ADD CONSTRAINT "PurchaseOrderDeliveryPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderDeliveryPlan" ADD CONSTRAINT "PurchaseOrderDeliveryPlan_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderDeliveryPlan" ADD CONSTRAINT "PurchaseOrderDeliveryPlan_purchaseOrderVersionId_fkey" FOREIGN KEY ("purchaseOrderVersionId") REFERENCES "PurchaseOrderVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
