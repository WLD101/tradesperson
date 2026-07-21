-- CreateEnum
CREATE TYPE "ProductLifecycleStatus" AS ENUM ('ACTIVE', 'DISCONTINUED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProductRecordStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProductAttributeValueType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'JSON');

-- CreateEnum
CREATE TYPE "UnitOfMeasureKind" AS ENUM ('EACH', 'SQM', 'LM', 'ROLL', 'PACK', 'LITRE', 'KG', 'BAG', 'TUB', 'OTHER');

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ProductRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manufacturer" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "countryCode" VARCHAR(2),
    "status" "ProductRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "manufacturerId" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProductRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCollection" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "manufacturerId" UUID,
    "brandId" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProductRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "ProductCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitOfMeasure" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "kind" "UnitOfMeasureKind" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "status" "ProductRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "UnitOfMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "manufacturerId" UUID,
    "brandId" UUID,
    "collectionId" UUID,
    "primaryUnitId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "supplierSkuPlaceholder" TEXT,
    "description" TEXT,
    "material" TEXT,
    "colour" TEXT,
    "shade" TEXT,
    "pattern" TEXT,
    "batchTrackingRequired" BOOLEAN NOT NULL DEFAULT false,
    "fireRating" TEXT,
    "slipRating" TEXT,
    "acousticRating" TEXT,
    "underfloorHeatingCompatible" BOOLEAN,
    "domesticCommercialClass" TEXT,
    "warranty" TEXT,
    "recommendedAdhesive" TEXT,
    "recommendedUnderlay" TEXT,
    "technicalData" TEXT,
    "safetyData" TEXT,
    "lifecycleStatus" "ProductLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "unitOfMeasureId" UUID,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "colour" TEXT,
    "shade" TEXT,
    "pattern" TEXT,
    "thicknessMm" DECIMAL(10,2),
    "wearLayerMm" DECIMAL(10,2),
    "rollWidthM" DECIMAL(10,2),
    "standardRollLengthM" DECIMAL(10,2),
    "tileLengthMm" DECIMAL(10,2),
    "tileWidthMm" DECIMAL(10,2),
    "packQuantity" INTEGER,
    "packCoverageM2" DECIMAL(10,4),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lifecycleStatus" "ProductLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttributeDefinition" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "categoryId" UUID,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "valueType" "ProductAttributeValueType" NOT NULL DEFAULT 'TEXT',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isFilterable" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ProductRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "ProductAttributeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttributeValue" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "attributeDefinitionId" UUID NOT NULL,
    "valueType" "ProductAttributeValueType" NOT NULL,
    "valueText" TEXT,
    "valueNumber" DECIMAL(14,4),
    "valueBoolean" BOOLEAN,
    "valueJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDocument" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "label" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "ProductDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "altText" TEXT,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT,
    "sizeBytes" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductCategory_tenantId_status_name_idx" ON "ProductCategory"("tenantId", "status", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_tenantId_slug_key" ON "ProductCategory"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "Manufacturer_tenantId_status_name_idx" ON "Manufacturer"("tenantId", "status", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Manufacturer_tenantId_slug_key" ON "Manufacturer"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "Brand_tenantId_status_name_idx" ON "Brand"("tenantId", "status", "name");

-- CreateIndex
CREATE INDEX "Brand_manufacturerId_idx" ON "Brand"("manufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_tenantId_slug_key" ON "Brand"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "ProductCollection_tenantId_status_name_idx" ON "ProductCollection"("tenantId", "status", "name");

-- CreateIndex
CREATE INDEX "ProductCollection_brandId_idx" ON "ProductCollection"("brandId");

-- CreateIndex
CREATE INDEX "ProductCollection_manufacturerId_idx" ON "ProductCollection"("manufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCollection_tenantId_slug_key" ON "ProductCollection"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "UnitOfMeasure_tenantId_status_name_idx" ON "UnitOfMeasure"("tenantId", "status", "name");

-- CreateIndex
CREATE UNIQUE INDEX "UnitOfMeasure_tenantId_code_key" ON "UnitOfMeasure"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Product_tenantId_lifecycleStatus_name_idx" ON "Product"("tenantId", "lifecycleStatus", "name");

-- CreateIndex
CREATE INDEX "Product_tenantId_categoryId_lifecycleStatus_idx" ON "Product"("tenantId", "categoryId", "lifecycleStatus");

-- CreateIndex
CREATE INDEX "Product_manufacturerId_idx" ON "Product"("manufacturerId");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- CreateIndex
CREATE INDEX "Product_collectionId_idx" ON "Product"("collectionId");

-- CreateIndex
CREATE INDEX "Product_primaryUnitId_idx" ON "Product"("primaryUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_slug_key" ON "Product"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_sku_key" ON "Product"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "ProductVariant_tenantId_productId_lifecycleStatus_idx" ON "ProductVariant"("tenantId", "productId", "lifecycleStatus");

-- CreateIndex
CREATE INDEX "ProductVariant_unitOfMeasureId_idx" ON "ProductVariant"("unitOfMeasureId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_tenantId_sku_key" ON "ProductVariant"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "ProductAttributeDefinition_tenantId_status_sortOrder_idx" ON "ProductAttributeDefinition"("tenantId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductAttributeDefinition_categoryId_idx" ON "ProductAttributeDefinition"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttributeDefinition_tenantId_key_key" ON "ProductAttributeDefinition"("tenantId", "key");

-- CreateIndex
CREATE INDEX "ProductAttributeValue_tenantId_productId_idx" ON "ProductAttributeValue"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "ProductAttributeValue_tenantId_variantId_idx" ON "ProductAttributeValue"("tenantId", "variantId");

-- CreateIndex
CREATE INDEX "ProductAttributeValue_attributeDefinitionId_idx" ON "ProductAttributeValue"("attributeDefinitionId");

-- CreateIndex
CREATE INDEX "ProductDocument_tenantId_productId_idx" ON "ProductDocument"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "ProductDocument_tenantId_variantId_idx" ON "ProductDocument"("tenantId", "variantId");

-- CreateIndex
CREATE INDEX "ProductImage_tenantId_productId_sortOrder_idx" ON "ProductImage"("tenantId", "productId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductImage_tenantId_variantId_idx" ON "ProductImage"("tenantId", "variantId");

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manufacturer" ADD CONSTRAINT "Manufacturer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCollection" ADD CONSTRAINT "ProductCollection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCollection" ADD CONSTRAINT "ProductCollection_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCollection" ADD CONSTRAINT "ProductCollection_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitOfMeasure" ADD CONSTRAINT "UnitOfMeasure_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "ProductCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_primaryUnitId_fkey" FOREIGN KEY ("primaryUnitId") REFERENCES "UnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_unitOfMeasureId_fkey" FOREIGN KEY ("unitOfMeasureId") REFERENCES "UnitOfMeasure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeDefinition" ADD CONSTRAINT "ProductAttributeDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeDefinition" ADD CONSTRAINT "ProductAttributeDefinition_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeDefinitionId_fkey" FOREIGN KEY ("attributeDefinitionId") REFERENCES "ProductAttributeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
