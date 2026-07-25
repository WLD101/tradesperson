-- CreateEnum
CREATE TYPE "GoodsReceiptStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('GOODS_RECEIPT', 'MATERIAL_ISSUE', 'MATERIAL_RETURN', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "InventoryMovementCondition" AS ENUM ('USABLE', 'DAMAGED', 'REJECTED');

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "purchaseOrderVersionId" UUID,
    "warehouseId" UUID NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "status" "GoodsReceiptStatus" NOT NULL DEFAULT 'DRAFT',
    "supplierReference" TEXT,
    "idempotencyKey" TEXT,
    "receivedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "postedById" UUID,
    "notes" TEXT,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceiptLine" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "goodsReceiptId" UUID NOT NULL,
    "purchaseOrderLineId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "productVariantId" UUID,
    "supplierProductId" UUID,
    "receivedQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "usableQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "damagedQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "rejectedQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "unitCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID,
    "warehouseId" UUID NOT NULL,
    "stockBalanceId" UUID,
    "productId" UUID NOT NULL,
    "productVariantId" UUID,
    "supplierProductId" UUID,
    "goodsReceiptId" UUID,
    "goodsReceiptLineId" UUID,
    "jobId" UUID,
    "materialRequirementId" UUID,
    "type" "InventoryMovementType" NOT NULL,
    "condition" "InventoryMovementCondition" NOT NULL DEFAULT 'USABLE',
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "value" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "idempotencyKey" TEXT,
    "notes" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipt_tenantId_receiptNumber_key" ON "GoodsReceipt"("tenantId", "receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipt_tenantId_purchaseOrderId_idempotencyKey_key" ON "GoodsReceipt"("tenantId", "purchaseOrderId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "GoodsReceipt_tenantId_branchId_status_createdAt_idx" ON "GoodsReceipt"("tenantId", "branchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "GoodsReceipt_tenantId_purchaseOrderId_createdAt_idx" ON "GoodsReceipt"("tenantId", "purchaseOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "GoodsReceipt_warehouseId_idx" ON "GoodsReceipt"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceiptLine_tenantId_goodsReceiptId_purchaseOrderLineId_key" ON "GoodsReceiptLine"("tenantId", "goodsReceiptId", "purchaseOrderLineId");

-- CreateIndex
CREATE INDEX "GoodsReceiptLine_tenantId_branchId_idx" ON "GoodsReceiptLine"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "GoodsReceiptLine_tenantId_purchaseOrderLineId_idx" ON "GoodsReceiptLine"("tenantId", "purchaseOrderLineId");

-- CreateIndex
CREATE INDEX "GoodsReceiptLine_tenantId_productId_idx" ON "GoodsReceiptLine"("tenantId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_tenantId_idempotencyKey_key" ON "InventoryMovement"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "InventoryMovement_tenantId_branchId_occurredAt_idx" ON "InventoryMovement"("tenantId", "branchId", "occurredAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_tenantId_warehouseId_productId_idx" ON "InventoryMovement"("tenantId", "warehouseId", "productId");

-- CreateIndex
CREATE INDEX "InventoryMovement_tenantId_goodsReceiptId_idx" ON "InventoryMovement"("tenantId", "goodsReceiptId");

-- CreateIndex
CREATE INDEX "InventoryMovement_tenantId_jobId_idx" ON "InventoryMovement"("tenantId", "jobId");

-- CreateIndex
CREATE INDEX "InventoryMovement_stockBalanceId_idx" ON "InventoryMovement"("stockBalanceId");

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_purchaseOrderVersionId_fkey" FOREIGN KEY ("purchaseOrderVersionId") REFERENCES "PurchaseOrderVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "GoodsReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_purchaseOrderLineId_fkey" FOREIGN KEY ("purchaseOrderLineId") REFERENCES "PurchaseOrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_stockBalanceId_fkey" FOREIGN KEY ("stockBalanceId") REFERENCES "StockBalance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "GoodsReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_goodsReceiptLineId_fkey" FOREIGN KEY ("goodsReceiptLineId") REFERENCES "GoodsReceiptLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_materialRequirementId_fkey" FOREIGN KEY ("materialRequirementId") REFERENCES "MaterialRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
