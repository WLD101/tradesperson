-- CreateEnum
CREATE TYPE "OccupancyStatus" AS ENUM ('OCCUPIED', 'UNOCCUPIED', 'NEW_BUILD', 'UNDER_RENOVATION');

-- CreateEnum
CREATE TYPE "SurveyPurpose" AS ENUM ('ESTIMATE', 'MEASUREMENT', 'INSPECTION', 'REMEDIAL');

-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED', 'APPROVED', 'SUPERSEDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('RECTANGLE', 'TRIANGLE', 'CIRCLE', 'SEMICIRCLE', 'ALCOVE', 'COLUMN', 'STAIR', 'LANDING', 'CORRIDOR', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MeasurementOperation" AS ENUM ('ADD', 'DEDUCT');

-- CreateEnum
CREATE TYPE "SubfloorType" AS ENUM ('CONCRETE', 'SAND_CEMENT_SCREED', 'ANHYDRITE_SCREED', 'TIMBER_BOARDS', 'PLYWOOD', 'CHIPBOARD', 'EXISTING_TILE', 'EXISTING_RESILIENT', 'RAISED_ACCESS', 'OTHER', 'UNKNOWN');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "asbestosConcern" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "county" TEXT,
ADD COLUMN     "createdById" UUID,
ADD COLUMN     "dampConcern" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "floorLevel" TEXT,
ADD COLUMN     "generalSiteNotes" TEXT,
ADD COLUMN     "hasLift" BOOLEAN,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "occupancyStatus" "OccupancyStatus",
ADD COLUMN     "parkingNotes" TEXT,
ADD COLUMN     "primaryContactEmail" TEXT,
ADD COLUMN     "primaryContactName" TEXT,
ADD COLUMN     "primaryContactPhone" TEXT,
ADD COLUMN     "updatedById" UUID,
ADD COLUMN     "workingHourNotes" TEXT;

-- CreateTable
CREATE TABLE "Survey" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID,
    "siteId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "leadId" UUID,
    "reference" TEXT NOT NULL,
    "status" "SurveyStatus" NOT NULL DEFAULT 'DRAFT',
    "purpose" "SurveyPurpose",
    "revision" INTEGER NOT NULL DEFAULT 1,
    "scheduledAt" TIMESTAMP(3),
    "surveyorId" UUID,
    "customerName" TEXT,
    "customerSignatureRef" TEXT,
    "surveyorSignatureRef" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyRoom" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "surveyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "floorLevel" TEXT,
    "existingCovering" TEXT,
    "subfloorType" "SubfloorType",
    "subfloorCondition" TEXT,
    "underfloorHeating" BOOLEAN NOT NULL DEFAULT false,
    "upliftRequired" BOOLEAN NOT NULL DEFAULT false,
    "netArea" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "grossArea" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "perimeter" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "wastePercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "wasteAdjustedArea" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "overrideArea" DECIMAL(10,4),
    "overrideReason" TEXT,
    "overrideUserId" UUID,
    "overrideAt" TIMESTAMP(3),
    "preparationNotes" TEXT,
    "installationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "SurveyRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeasurementComponent" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "type" "ComponentType" NOT NULL,
    "operation" "MeasurementOperation" NOT NULL DEFAULT 'ADD',
    "dimensions" JSONB NOT NULL,
    "calculatedArea" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "MeasurementComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Survey_tenantId_siteId_idx" ON "Survey"("tenantId", "siteId");

-- CreateIndex
CREATE INDEX "Survey_tenantId_customerId_idx" ON "Survey"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "Survey_tenantId_branchId_idx" ON "Survey"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "Survey_tenantId_surveyorId_idx" ON "Survey"("tenantId", "surveyorId");

-- CreateIndex
CREATE INDEX "SurveyRoom_tenantId_surveyId_idx" ON "SurveyRoom"("tenantId", "surveyId");

-- CreateIndex
CREATE INDEX "MeasurementComponent_tenantId_roomId_idx" ON "MeasurementComponent"("tenantId", "roomId");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_surveyorId_fkey" FOREIGN KEY ("surveyorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyRoom" ADD CONSTRAINT "SurveyRoom_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyRoom" ADD CONSTRAINT "SurveyRoom_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyRoom" ADD CONSTRAINT "SurveyRoom_overrideUserId_fkey" FOREIGN KEY ("overrideUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyRoom" ADD CONSTRAINT "SurveyRoom_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyRoom" ADD CONSTRAINT "SurveyRoom_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeasurementComponent" ADD CONSTRAINT "MeasurementComponent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeasurementComponent" ADD CONSTRAINT "MeasurementComponent_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "SurveyRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeasurementComponent" ADD CONSTRAINT "MeasurementComponent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeasurementComponent" ADD CONSTRAINT "MeasurementComponent_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
