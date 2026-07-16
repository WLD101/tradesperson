-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Supplier" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID,
    "legalName" TEXT NOT NULL,
    "tradingName" TEXT,
    "supplierCode" TEXT NOT NULL,
    "accountNumber" TEXT,
    "companyRegistrationNumber" TEXT,
    "vatRegistrationNumber" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "website" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "county" TEXT,
    "postcode" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'GB',
    "paymentTermsDescription" TEXT,
    "creditLimit" DECIMAL(12,2),
    "defaultCurrency" TEXT NOT NULL DEFAULT 'GBP',
    "typicalLeadTimeDays" INTEGER,
    "minimumOrderNotes" TEXT,
    "deliveryNotes" TEXT,
    "returnPolicyNotes" TEXT,
    "preferredSupplier" BOOLEAN NOT NULL DEFAULT false,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierContact" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "branchId" UUID,
    "name" TEXT NOT NULL,
    "jobTitle" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "mobile" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isOrderingContact" BOOLEAN NOT NULL DEFAULT false,
    "isAccountsContact" BOOLEAN NOT NULL DEFAULT false,
    "isTechnicalContact" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "SupplierContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierProduct" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "supplierUnitId" UUID,
    "supplierSku" TEXT NOT NULL,
    "supplierDescription" TEXT,
    "packQuantity" DECIMAL(12,2),
    "packCoverageM2" DECIMAL(10,4),
    "rollWidthM" DECIMAL(10,2),
    "standardRollLengthM" DECIMAL(10,2),
    "minimumOrderQty" DECIMAL(12,2),
    "leadTimeDays" INTEGER,
    "preferredSupplier" BOOLEAN NOT NULL DEFAULT false,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastConfirmedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "SupplierProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplier_tenantId_status_legalName_idx" ON "Supplier"("tenantId", "status", "legalName");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_preferredSupplier_status_idx" ON "Supplier"("tenantId", "preferredSupplier", "status");

-- CreateIndex
CREATE INDEX "Supplier_branchId_idx" ON "Supplier"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_tenantId_supplierCode_key" ON "Supplier"("tenantId", "supplierCode");

-- CreateIndex
CREATE INDEX "SupplierContact_tenantId_supplierId_status_idx" ON "SupplierContact"("tenantId", "supplierId", "status");

-- CreateIndex
CREATE INDEX "SupplierContact_branchId_idx" ON "SupplierContact"("branchId");

-- CreateIndex
CREATE INDEX "SupplierProduct_tenantId_supplierId_status_idx" ON "SupplierProduct"("tenantId", "supplierId", "status");

-- CreateIndex
CREATE INDEX "SupplierProduct_tenantId_productId_status_idx" ON "SupplierProduct"("tenantId", "productId", "status");

-- CreateIndex
CREATE INDEX "SupplierProduct_tenantId_variantId_status_idx" ON "SupplierProduct"("tenantId", "variantId", "status");

-- CreateIndex
CREATE INDEX "SupplierProduct_supplierUnitId_idx" ON "SupplierProduct"("supplierUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProduct_tenantId_supplierId_supplierSku_key" ON "SupplierProduct"("tenantId", "supplierId", "supplierSku");

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierContact" ADD CONSTRAINT "SupplierContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierContact" ADD CONSTRAINT "SupplierContact_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierContact" ADD CONSTRAINT "SupplierContact_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_supplierUnitId_fkey" FOREIGN KEY ("supplierUnitId") REFERENCES "UnitOfMeasure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
