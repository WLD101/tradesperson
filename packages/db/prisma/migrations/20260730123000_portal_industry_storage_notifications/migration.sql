-- Schema slice introduced by portal, industry, attachment, and notification modules.
-- Kept forward-only and backfilled so existing demo data can be migrated safely.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'UPLOADED', 'FAILED');
CREATE TYPE "IndustryType" AS ENUM ('FLOORING', 'HVAC', 'PLUMBING', 'ELECTRICAL', 'ROOFING', 'LANDSCAPING', 'GENERAL_CONTRACTING');
CREATE TYPE "FlooringType" AS ENUM ('CARPET_ROLL', 'SHEET_VINYL', 'LVT_PLANK', 'HARDWOOD', 'TILE');
CREATE TYPE "SampleStatus" AS ENUM ('IN_SHOWROOM', 'CHECKED_OUT', 'OVERDUE', 'LOST');
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'OVERDUE';

ALTER TABLE "Tenant"
ADD COLUMN "activeIndustries" "IndustryType"[] NOT NULL DEFAULT ARRAY['FLOORING']::"IndustryType"[],
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE';

ALTER TABLE "Estimate"
ADD COLUMN "industryData" JSONB,
ADD COLUMN "portalToken" TEXT,
ADD COLUMN "portalTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "signatureData" TEXT,
ADD COLUMN "signedAt" TIMESTAMP(3);

UPDATE "Estimate"
SET "portalToken" = gen_random_uuid()::text
WHERE "portalToken" IS NULL;

ALTER TABLE "Estimate"
ALTER COLUMN "portalToken" SET NOT NULL;

ALTER TABLE "Invoice"
ADD COLUMN "portalToken" TEXT,
ADD COLUMN "portalTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "stripeCheckoutSessionId" TEXT,
ADD COLUMN "stripePaymentIntentId" TEXT;

UPDATE "Invoice"
SET "portalToken" = gen_random_uuid()::text
WHERE "portalToken" IS NULL;

ALTER TABLE "Invoice"
ALTER COLUMN "portalToken" SET NOT NULL;

ALTER TABLE "Job" ADD COLUMN "industryData" JSONB;
ALTER TABLE "Product" ADD COLUMN "industryData" JSONB;

CREATE TABLE "FileAttachment" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" "FileStatus" NOT NULL DEFAULT 'PENDING',
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FileAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryRoll" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "dyeLotNumber" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "widthInInches" INTEGER NOT NULL,
    "initialLengthFt" DOUBLE PRECISION NOT NULL,
    "currentLengthFt" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "locationBin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryRoll_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RollCut" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "rollId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "cutLengthFt" DOUBLE PRECISION NOT NULL,
    "wasteLengthFt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cutByUserId" UUID NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RollCut_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShowroomSample" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "sampleCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "status" "SampleStatus" NOT NULL DEFAULT 'IN_SHOWROOM',
    "checkedOutToId" UUID,
    "checkedOutAt" TIMESTAMP(3),
    "expectedReturn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShowroomSample_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StripeSubscription" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StripeSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_logs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "recipient" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "template" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FileAttachment_storageKey_key" ON "FileAttachment"("storageKey");
CREATE INDEX "FileAttachment_tenantId_entityType_entityId_idx" ON "FileAttachment"("tenantId", "entityType", "entityId");
CREATE INDEX "FileAttachment_tenantId_id_idx" ON "FileAttachment"("tenantId", "id");
CREATE INDEX "InventoryRoll_tenantId_productId_idx" ON "InventoryRoll"("tenantId", "productId");
CREATE INDEX "InventoryRoll_tenantId_dyeLotNumber_idx" ON "InventoryRoll"("tenantId", "dyeLotNumber");
CREATE INDEX "RollCut_tenantId_rollId_idx" ON "RollCut"("tenantId", "rollId");
CREATE INDEX "ShowroomSample_tenantId_sampleCode_idx" ON "ShowroomSample"("tenantId", "sampleCode");
CREATE UNIQUE INDEX "StripeSubscription_tenantId_key" ON "StripeSubscription"("tenantId");
CREATE UNIQUE INDEX "StripeSubscription_stripeSubscriptionId_key" ON "StripeSubscription"("stripeSubscriptionId");
CREATE INDEX "notification_logs_tenantId_createdAt_idx" ON "notification_logs"("tenantId", "createdAt");
CREATE INDEX "notification_logs_tenantId_status_idx" ON "notification_logs"("tenantId", "status");
CREATE UNIQUE INDEX "Estimate_portalToken_key" ON "Estimate"("portalToken");
CREATE UNIQUE INDEX "Invoice_portalToken_key" ON "Invoice"("portalToken");

ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryRoll" ADD CONSTRAINT "InventoryRoll_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RollCut" ADD CONSTRAINT "RollCut_rollId_fkey" FOREIGN KEY ("rollId") REFERENCES "InventoryRoll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShowroomSample" ADD CONSTRAINT "ShowroomSample_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StripeSubscription" ADD CONSTRAINT "StripeSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

