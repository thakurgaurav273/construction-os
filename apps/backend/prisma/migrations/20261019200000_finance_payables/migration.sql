-- AlterEnum
BEGIN;
CREATE TYPE "InvoiceStatus_new" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'REJECTED', 'CANCELLED');
ALTER TABLE "invoices" ALTER COLUMN "status" DROP DEFAULT;
-- SENT meant "received, awaiting approval". OVERDUE is now derived from dueDate, so those bills return to
-- APPROVED and are promoted to PARTIALLY_PAID / PAID below from their actual payments.
ALTER TABLE "invoices" ALTER COLUMN "status" TYPE "InvoiceStatus_new" USING (
  CASE "status"::text
    WHEN 'SENT' THEN 'PENDING_APPROVAL'
    WHEN 'OVERDUE' THEN 'APPROVED'
    ELSE "status"::text
  END
)::"InvoiceStatus_new";
ALTER TYPE "InvoiceStatus" RENAME TO "InvoiceStatus_old";
ALTER TYPE "InvoiceStatus_new" RENAME TO "InvoiceStatus";
DROP TYPE "InvoiceStatus_old";
ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- DropIndex
DROP INDEX "invoices_status_idx";

-- DropIndex
DROP INDEX "invoices_invoiceNumber_organizationId_key";

-- AlterTable
ALTER TABLE "vendors" DROP COLUMN "outstandingBalance";

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "purchaseOrderId" TEXT,
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "approvedBy",
ADD COLUMN     "requestedById" TEXT,
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "vendorId" TEXT;

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "poLineItemId" TEXT,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "rate" DECIMAL(15,2) NOT NULL,
    "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_items_poLineItemId_idx" ON "invoice_items"("poLineItemId");

-- CreateIndex
CREATE INDEX "invoices_organizationId_status_idx" ON "invoices"("organizationId", "status");

-- CreateIndex
CREATE INDEX "invoices_vendorId_idx" ON "invoices"("vendorId");

-- CreateIndex
CREATE INDEX "invoices_purchaseOrderId_idx" ON "invoices"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_organizationId_vendorName_invoiceNumber_key" ON "invoices"("organizationId", "vendorName", "invoiceNumber");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_vendorId_idx" ON "payments"("vendorId");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_poLineItemId_fkey" FOREIGN KEY ("poLineItemId") REFERENCES "po_line_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: link existing bills and payments to vendors on the panel by name.
UPDATE "invoices" i SET "vendorId" = v."id"
FROM "vendors" v
WHERE i."vendorId" IS NULL AND v."organizationId" = i."organizationId" AND lower(v."name") = lower(i."vendorName");

UPDATE "payments" p SET "vendorId" = v."id"
FROM "vendors" v
WHERE p."vendorId" IS NULL AND v."organizationId" = p."organizationId" AND lower(v."name") = lower(p."vendorName");

-- Backfill: invoice status follows what has actually been paid against it.
UPDATE "invoices" i SET "status" = CASE WHEN paid.total >= i."totalAmount" THEN 'PAID'::"InvoiceStatus" ELSE 'PARTIALLY_PAID'::"InvoiceStatus" END
FROM (SELECT "invoiceId", SUM("amount") AS total FROM "payments" WHERE "status" = 'PAID' AND "invoiceId" IS NOT NULL GROUP BY "invoiceId") paid
WHERE paid."invoiceId" = i."id" AND i."status" = 'APPROVED' AND paid.total > 0;
