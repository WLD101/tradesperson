-- CreateEnum
CREATE TYPE "StockReservationStatus" AS ENUM ('RESERVED', 'PARTIALLY_ISSUED', 'ISSUED', 'CANCELLED');

-- CreateTable
CREATE TABLE "InventoryWarehouse" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "addressLine1" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryWarehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockBalance" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID,
    "warehouseId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "productVariantId" UUID,
    "supplierProductId" UUID,
    "unit" TEXT NOT NULL,
    "onHandQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "reservedQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "issuedQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReservation" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID,
    "warehouseId" UUID NOT NULL,
    "stockBalanceId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "materialRequirementId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "productVariantId" UUID,
    "supplierProductId" UUID,
    "status" "StockReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "reservedQuantity" DECIMAL(14,4) NOT NULL,
    "issuedQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "reservedById" UUID,
    "issuedById" UUID,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryWarehouse_tenantId_code_key" ON "InventoryWarehouse"("tenantId", "code");

-- CreateIndex
CREATE INDEX "InventoryWarehouse_tenantId_branchId_idx" ON "InventoryWarehouse"("tenantId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "StockBalance_tenantId_warehouseId_productId_productVariantId_supplierProductId_key" ON "StockBalance"("tenantId", "warehouseId", "productId", "productVariantId", "supplierProductId");

-- CreateIndex
CREATE INDEX "StockBalance_tenantId_productId_idx" ON "StockBalance"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "StockBalance_tenantId_branchId_idx" ON "StockBalance"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "StockReservation_tenantId_jobId_status_idx" ON "StockReservation"("tenantId", "jobId", "status");

-- CreateIndex
CREATE INDEX "StockReservation_tenantId_materialRequirementId_idx" ON "StockReservation"("tenantId", "materialRequirementId");

-- CreateIndex
CREATE INDEX "StockReservation_tenantId_warehouseId_idx" ON "StockReservation"("tenantId", "warehouseId");

-- CreateIndex
CREATE INDEX "StockReservation_stockBalanceId_idx" ON "StockReservation"("stockBalanceId");

-- AddForeignKey
ALTER TABLE "InventoryWarehouse" ADD CONSTRAINT "InventoryWarehouse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryWarehouse" ADD CONSTRAINT "InventoryWarehouse_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_stockBalanceId_fkey" FOREIGN KEY ("stockBalanceId") REFERENCES "StockBalance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_materialRequirementId_fkey" FOREIGN KEY ("materialRequirementId") REFERENCES "MaterialRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
