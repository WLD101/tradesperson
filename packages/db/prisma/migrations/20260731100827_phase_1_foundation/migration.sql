-- AlterTable
ALTER TABLE "Tenant" ALTER COLUMN "activeIndustries" SET DEFAULT ARRAY['FLOORING']::"IndustryType"[];
