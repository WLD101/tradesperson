-- AlterEnum
ALTER TYPE "MaterialRequirementStatus" ADD VALUE 'PARTIALLY_ISSUED';
ALTER TYPE "MaterialRequirementStatus" ADD VALUE 'ISSUED';

-- AlterTable
ALTER TABLE "MaterialRequirement" ADD COLUMN "issuedQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0;
