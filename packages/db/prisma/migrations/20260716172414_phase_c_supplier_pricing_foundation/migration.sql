-- CreateEnum
CREATE TYPE "SupplierPriceListStatus" AS ENUM ('DRAFT', 'VALIDATED', 'APPROVED', 'ACTIVE', 'SUPERSEDED', 'EXPIRED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SupplierPriceSourceType" AS ENUM ('MANUAL', 'CSV_IMPORT', 'XLSX_IMPORT', 'NEGOTIATED', 'PROMOTION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SupplierPriceBasis" AS ENUM ('EACH', 'METRE', 'SQUARE_METRE', 'LINEAR_METRE', 'PACK', 'ROLL', 'TUB', 'BAG', 'BOX', 'PAIR', 'SET');

-- CreateEnum
CREATE TYPE "SupplierPriceImportStatus" AS ENUM ('DRAFT', 'VALIDATED', 'APPROVED', 'EXECUTING', 'EXECUTED', 'FAILED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SupplierPriceImportFileType" AS ENUM ('CSV', 'XLSX');

-- CreateEnum
CREATE TYPE "SupplierPriceImportRowStatus" AS ENUM ('VALID', 'INVALID', 'UNMATCHED', 'DUPLICATE', 'APPROVED', 'IMPORTED', 'SKIPPED');

-- CreateTable
CREATE TABLE "SupplierPriceList" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "reference" TEXT,
    "currency" TEXT NOT NULL,
    "status" "SupplierPriceListStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" "SupplierPriceSourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceFilename" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "SupplierPriceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPriceListVersion" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "priceListId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "SupplierPriceListStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL,
    "sourceType" "SupplierPriceSourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceImportId" UUID,
    "revisionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdById" UUID,
    "approvedById" UUID,

    CONSTRAINT "SupplierPriceListVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierProductPrice" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "supplierProductId" UUID NOT NULL,
    "priceListVersionId" UUID NOT NULL,
    "pricingUnitId" UUID,
    "priceBasis" "SupplierPriceBasis" NOT NULL,
    "currency" TEXT NOT NULL,
    "baseCost" DECIMAL(14,4) NOT NULL,
    "packCost" DECIMAL(14,4),
    "rollCost" DECIMAL(14,4),
    "areaCost" DECIMAL(14,4),
    "quantityFrom" DECIMAL(12,4),
    "quantityTo" DECIMAL(12,4),
    "minimumOrderQty" DECIMAL(12,4),
    "deliveryCostPlaceholder" DECIMAL(14,4),
    "promotionalCost" DECIMAL(14,4),
    "promotionStart" TIMESTAMP(3),
    "promotionEnd" TIMESTAMP(3),
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "taxTreatmentCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "SupplierProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierProductPriceHistory" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "supplierProductId" UUID NOT NULL,
    "supplierProductPriceId" UUID,
    "priceListVersionId" UUID,
    "currency" TEXT NOT NULL,
    "priceBasis" "SupplierPriceBasis" NOT NULL,
    "previousBaseCost" DECIMAL(14,4),
    "newBaseCost" DECIMAL(14,4) NOT NULL,
    "previousPromotionalCost" DECIMAL(14,4),
    "newPromotionalCost" DECIMAL(14,4),
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "approvalStatus" "SupplierPriceListStatus" NOT NULL,
    "changeReason" TEXT,
    "sourceType" "SupplierPriceSourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceLabel" TEXT,
    "actorUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierProductPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPriceImport" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "priceListId" UUID,
    "status" "SupplierPriceImportStatus" NOT NULL DEFAULT 'DRAFT',
    "fileType" "SupplierPriceImportFileType" NOT NULL,
    "sourceFilename" TEXT NOT NULL,
    "worksheetName" TEXT,
    "headerRowNumber" INTEGER,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "validRowCount" INTEGER NOT NULL DEFAULT 0,
    "invalidRowCount" INTEGER NOT NULL DEFAULT 0,
    "unmatchedRowCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateRowCount" INTEGER NOT NULL DEFAULT 0,
    "importedRowCount" INTEGER NOT NULL DEFAULT 0,
    "mappingSnapshot" JSONB,
    "validationSummary" JSONB,
    "errorSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "createdById" UUID,
    "approvedById" UUID,
    "executedById" UUID,

    CONSTRAINT "SupplierPriceImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPriceImportRow" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "importId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "supplierProductId" UUID,
    "matchedProductId" UUID,
    "matchedVariantId" UUID,
    "rowNumber" INTEGER NOT NULL,
    "status" "SupplierPriceImportRowStatus" NOT NULL DEFAULT 'VALID',
    "duplicateKey" TEXT,
    "rawData" JSONB NOT NULL,
    "normalizedData" JSONB,
    "errorMessages" JSONB,
    "warningMessages" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPriceImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPriceImportMapping" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "fileType" "SupplierPriceImportFileType" NOT NULL,
    "mappingJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "SupplierPriceImportMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierPriceList_tenantId_supplierId_status_idx" ON "SupplierPriceList"("tenantId", "supplierId", "status");

-- CreateIndex
CREATE INDEX "SupplierPriceList_tenantId_status_effectiveDate_idx" ON "SupplierPriceList"("tenantId", "status", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPriceList_tenantId_supplierId_name_key" ON "SupplierPriceList"("tenantId", "supplierId", "name");

-- CreateIndex
CREATE INDEX "SupplierPriceListVersion_tenantId_supplierId_status_effecti_idx" ON "SupplierPriceListVersion"("tenantId", "supplierId", "status", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPriceListVersion_sourceImportId_key" ON "SupplierPriceListVersion"("sourceImportId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPriceListVersion_priceListId_versionNumber_key" ON "SupplierPriceListVersion"("priceListId", "versionNumber");

-- CreateIndex
CREATE INDEX "SupplierProductPrice_tenantId_supplierProductId_isActive_ef_idx" ON "SupplierProductPrice"("tenantId", "supplierProductId", "isActive", "effectiveDate");

-- CreateIndex
CREATE INDEX "SupplierProductPrice_tenantId_supplierId_priceListVersionId_idx" ON "SupplierProductPrice"("tenantId", "supplierId", "priceListVersionId");

-- CreateIndex
CREATE INDEX "SupplierProductPrice_tenantId_currency_priceBasis_idx" ON "SupplierProductPrice"("tenantId", "currency", "priceBasis");

-- CreateIndex
CREATE INDEX "SupplierProductPrice_pricingUnitId_idx" ON "SupplierProductPrice"("pricingUnitId");

-- CreateIndex
CREATE INDEX "SupplierProductPriceHistory_tenantId_supplierProductId_crea_idx" ON "SupplierProductPriceHistory"("tenantId", "supplierProductId", "createdAt");

-- CreateIndex
CREATE INDEX "SupplierProductPriceHistory_tenantId_priceListVersionId_idx" ON "SupplierProductPriceHistory"("tenantId", "priceListVersionId");

-- CreateIndex
CREATE INDEX "SupplierPriceImport_tenantId_supplierId_status_createdAt_idx" ON "SupplierPriceImport"("tenantId", "supplierId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SupplierPriceImport_priceListId_idx" ON "SupplierPriceImport"("priceListId");

-- CreateIndex
CREATE INDEX "SupplierPriceImportRow_tenantId_supplierId_status_idx" ON "SupplierPriceImportRow"("tenantId", "supplierId", "status");

-- CreateIndex
CREATE INDEX "SupplierPriceImportRow_supplierProductId_idx" ON "SupplierPriceImportRow"("supplierProductId");

-- CreateIndex
CREATE INDEX "SupplierPriceImportRow_matchedProductId_idx" ON "SupplierPriceImportRow"("matchedProductId");

-- CreateIndex
CREATE INDEX "SupplierPriceImportRow_matchedVariantId_idx" ON "SupplierPriceImportRow"("matchedVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPriceImportRow_importId_rowNumber_key" ON "SupplierPriceImportRow"("importId", "rowNumber");

-- CreateIndex
CREATE INDEX "SupplierPriceImportMapping_tenantId_supplierId_fileType_idx" ON "SupplierPriceImportMapping"("tenantId", "supplierId", "fileType");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPriceImportMapping_tenantId_supplierId_name_key" ON "SupplierPriceImportMapping"("tenantId", "supplierId", "name");

-- AddForeignKey
ALTER TABLE "SupplierPriceList" ADD CONSTRAINT "SupplierPriceList_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPriceList" ADD CONSTRAINT "SupplierPriceList_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPriceListVersion" ADD CONSTRAINT "SupplierPriceListVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPriceListVersion" ADD CONSTRAINT "SupplierPriceListVersion_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPriceListVersion" ADD CONSTRAINT "SupplierPriceListVersion_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "SupplierPriceList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPriceListVersion" ADD CONSTRAINT "SupplierPriceListVersion_sourceImportId_fkey" FOREIGN KEY ("sourceImportId") REFERENCES "SupplierPriceImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProductPrice" ADD CONSTRAINT "SupplierProductPrice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProductPrice" ADD CONSTRAINT "SupplierProductPrice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProductPrice" ADD CONSTRAINT "SupplierProductPrice_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProductPrice" ADD CONSTRAINT "SupplierProductPrice_priceListVersionId_fkey" FOREIGN KEY ("priceListVersionId") REFERENCES "SupplierPriceListVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProductPrice" ADD CONSTRAINT "SupplierProductPrice_pricingUnitId_fkey" FOREIGN KEY ("pricingUnitId") REFERENCES "UnitOfMeasure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProductPriceHistory" ADD CONSTRAINT "SupplierProductPriceHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProductPriceHistory" ADD CONSTRAINT "SupplierProductPriceHistory_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProductPriceHistory" ADD CONSTRAINT "SupplierProductPriceHistory_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProductPriceHistory" ADD CONSTRAINT "SupplierProductPriceHistory_supplierProductPriceId_fkey" FOREIGN KEY ("supplierProductPriceId") REFERENCES "SupplierProductPrice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProductPriceHistory" ADD CONSTRAINT "SupplierProductPriceHistory_priceListVersionId_fkey" FOREIGN KEY ("priceListVersionId") REFERENCES "SupplierPriceListVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPriceImport" ADD CONSTRAINT "SupplierPriceImport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPriceImport" ADD CONSTRAINT "SupplierPriceImport_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPriceImport" ADD CONSTRAINT "SupplierPriceImport_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "SupplierPriceList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPriceImportRow" ADD CONSTRAINT "SupplierPriceImportRow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPriceImportRow" ADD CONSTRAINT "SupplierPriceImportRow_importId_fkey" FOREIGN KEY ("importId") REFERENCES "SupplierPriceImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPriceImportRow" ADD CONSTRAINT "SupplierPriceImportRow_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPriceImportRow" ADD CONSTRAINT "SupplierPriceImportRow_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPriceImportRow" ADD CONSTRAINT "SupplierPriceImportRow_matchedProductId_fkey" FOREIGN KEY ("matchedProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPriceImportRow" ADD CONSTRAINT "SupplierPriceImportRow_matchedVariantId_fkey" FOREIGN KEY ("matchedVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPriceImportMapping" ADD CONSTRAINT "SupplierPriceImportMapping_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPriceImportMapping" ADD CONSTRAINT "SupplierPriceImportMapping_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
