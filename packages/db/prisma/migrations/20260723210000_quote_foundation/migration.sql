CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'CONVERTED');
CREATE TYPE "QuoteVersionStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'ARCHIVED');

CREATE TABLE "Quote" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID,
    "customerId" UUID NOT NULL,
    "siteId" UUID NOT NULL,
    "estimateId" UUID,
    "quoteNumber" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "subtotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "vatRate" DECIMAL(8,4) NOT NULL DEFAULT 0.2,
    "vatAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "depositRequired" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "depositPaid" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "validUntil" TIMESTAMP(3),
    "terms" TEXT,
    "customerNotes" TEXT,
    "internalNotes" TEXT,
    "createdById" UUID,
    "updatedById" UUID,
    "sentById" UUID,
    "approvedById" UUID,
    "rejectedById" UUID,
    "sentAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuoteLine" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "sourceEstimateLineId" UUID,
    "lineType" "EstimateLineType" NOT NULL DEFAULT 'MATERIAL',
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitSellPrice" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "sellTotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "vatRate" DECIMAL(8,4) NOT NULL DEFAULT 0.2,
    "vatAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuoteVersion" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "QuoteVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "subtotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "vatRate" DECIMAL(8,4) NOT NULL DEFAULT 0.2,
    "vatAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "depositRequired" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "snapshot" JSONB NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Quote_tenantId_quoteNumber_key" ON "Quote"("tenantId", "quoteNumber");
CREATE INDEX "Quote_tenantId_branchId_status_createdAt_idx" ON "Quote"("tenantId", "branchId", "status", "createdAt");
CREATE INDEX "Quote_tenantId_customerId_createdAt_idx" ON "Quote"("tenantId", "customerId", "createdAt");
CREATE INDEX "Quote_tenantId_siteId_createdAt_idx" ON "Quote"("tenantId", "siteId", "createdAt");
CREATE INDEX "Quote_estimateId_idx" ON "Quote"("estimateId");
CREATE INDEX "QuoteLine_tenantId_quoteId_displayOrder_idx" ON "QuoteLine"("tenantId", "quoteId", "displayOrder");
CREATE INDEX "QuoteLine_sourceEstimateLineId_idx" ON "QuoteLine"("sourceEstimateLineId");
CREATE UNIQUE INDEX "QuoteVersion_tenantId_quoteId_versionNumber_key" ON "QuoteVersion"("tenantId", "quoteId", "versionNumber");
CREATE INDEX "QuoteVersion_tenantId_status_createdAt_idx" ON "QuoteVersion"("tenantId", "status", "createdAt");
CREATE INDEX "QuoteVersion_tenantId_quoteId_versionNumber_idx" ON "QuoteVersion"("tenantId", "quoteId", "versionNumber");

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_sourceEstimateLineId_fkey" FOREIGN KEY ("sourceEstimateLineId") REFERENCES "EstimateLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuoteVersion" ADD CONSTRAINT "QuoteVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuoteVersion" ADD CONSTRAINT "QuoteVersion_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
