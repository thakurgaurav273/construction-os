-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "raBillId" TEXT,
ADD COLUMN     "retentionReleaseId" TEXT;

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "paymentTermDays" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "contract_adjustment_rules" ADD COLUMN     "isRetention" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ra_bills" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "invoiceNumber" TEXT;

-- AlterTable
ALTER TABLE "ra_bill_adjustments" ADD COLUMN     "isRetention" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ra_bill_receipts" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'bank_transfer',
    "reference" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "recordedById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "voidNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ra_bill_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_releases" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "releasedOn" TIMESTAMP(3) NOT NULL,
    "reference" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retention_releases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ra_bill_receipts_billId_idx" ON "ra_bill_receipts"("billId");

-- CreateIndex
CREATE INDEX "retention_releases_contractId_idx" ON "retention_releases"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_raBillId_key" ON "invoices"("raBillId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_retentionReleaseId_key" ON "invoices"("retentionReleaseId");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_raBillId_fkey" FOREIGN KEY ("raBillId") REFERENCES "ra_bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_retentionReleaseId_fkey" FOREIGN KEY ("retentionReleaseId") REFERENCES "retention_releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ra_bill_receipts" ADD CONSTRAINT "ra_bill_receipts_billId_fkey" FOREIGN KEY ("billId") REFERENCES "ra_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_releases" ADD CONSTRAINT "retention_releases_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

