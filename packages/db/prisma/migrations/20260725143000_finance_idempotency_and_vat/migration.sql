-- AddEnumValue
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_jobId_key" ON "Invoice"("tenantId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_tenantId_invoiceId_idempotencyKey_key" ON "Payment"("tenantId", "invoiceId", "idempotencyKey");
