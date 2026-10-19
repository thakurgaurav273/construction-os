-- Procurement write flows: typed statuses, user references instead of display names,
-- RFQ invitations + quotes, and deliveries (GRNs) linked to purchase orders by FK.
-- Existing rows are converted in place; columns that are now derived from real records are dropped last.

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "ProcurementPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'PENDING', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "RfqStatus" AS ENUM ('OPEN', 'EVALUATING', 'AWARDED', 'CANCELLED');
CREATE TYPE "RfqInvitationStatus" AS ENUM ('INVITED', 'QUOTED', 'DECLINED');
CREATE TYPE "DeliveryStatus" AS ENUM ('SCHEDULED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "rfq_items" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rfq_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rfq_invitations" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "status" "RfqInvitationStatus" NOT NULL DEFAULT 'INVITED',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "leadTimeDays" INTEGER,
    "validUntil" TIMESTAMP(3),
    "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quotedAmount" DECIMAL(15,2),
    "notes" TEXT,

    CONSTRAINT "rfq_invitations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rfq_quote_items" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "rfqItemId" TEXT NOT NULL,
    "rate" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "rfq_quote_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_items" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "poLineItemId" TEXT NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,

    CONSTRAINT "delivery_items_pkey" PRIMARY KEY ("id")
);

-- ─── Vendors ────────────────────────────────────────────────────────────────

ALTER TABLE "vendors" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "vendors" ALTER COLUMN "status" TYPE "VendorStatus"
    USING (CASE WHEN lower("status") = 'active' THEN 'ACTIVE' ELSE 'INACTIVE' END)::"VendorStatus";
ALTER TABLE "vendors" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- ─── Purchase orders ────────────────────────────────────────────────────────

ALTER TABLE "purchase_orders"
    ADD COLUMN "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN "submittedAt" TIMESTAMP(3),
    ADD COLUMN "reviewedAt" TIMESTAMP(3),
    ADD COLUMN "reviewNote" TEXT,
    ADD COLUMN "requestedById" TEXT,
    ADD COLUMN "reviewedById" TEXT;

UPDATE "purchase_orders" SET "status" = (CASE lower("approvalStatus")
    WHEN 'pending' THEN 'PENDING'
    WHEN 'approved' THEN 'APPROVED'
    WHEN 'rejected' THEN 'REJECTED'
    WHEN 'changes_requested' THEN 'CHANGES_REQUESTED'
    ELSE 'DRAFT' END)::"PurchaseOrderStatus";

-- Requester and approver were stored as display names; link them to members of the same organization.
UPDATE "purchase_orders" po SET "requestedById" = u."id"
FROM "users" u JOIN "user_organizations" uo ON uo."userId" = u."id"
WHERE uo."organizationId" = po."organizationId" AND u."name" = po."createdBy";

UPDATE "purchase_orders" po SET "reviewedById" = u."id"
FROM "users" u JOIN "user_organizations" uo ON uo."userId" = u."id"
WHERE po."status" IN ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED')
  AND uo."organizationId" = po."organizationId" AND u."name" = po."approver";

UPDATE "purchase_orders" po SET "submittedAt" = COALESCE(
    (SELECT max(s."date") FROM "po_approval_steps" s WHERE s."purchaseOrderId" = po."id" AND s."stage" = 'Submitted'),
    po."requestedDate")
WHERE po."status" <> 'DRAFT';

UPDATE "purchase_orders" po SET "reviewedAt" = COALESCE(
    (SELECT max(s."date") FROM "po_approval_steps" s WHERE s."purchaseOrderId" = po."id" AND s."stage" IN ('Reviewed', 'Approved')),
    po."updatedAt")
WHERE po."status" IN ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

ALTER TABLE "purchase_orders" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "purchase_orders" ALTER COLUMN "priority" TYPE "ProcurementPriority"
    USING (CASE upper("priority") WHEN 'LOW' THEN 'LOW' WHEN 'HIGH' THEN 'HIGH' WHEN 'CRITICAL' THEN 'CRITICAL' ELSE 'MEDIUM' END)::"ProcurementPriority";
ALTER TABLE "purchase_orders" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';

ALTER TABLE "po_line_items" ADD COLUMN "receivedQuantity" DECIMAL(15,3) NOT NULL DEFAULT 0;

-- The timeline used to hold placeholder rows for stages not yet reached; it is now an event log.
DELETE FROM "po_approval_steps" WHERE "date" IS NULL;
ALTER TABLE "po_approval_steps" ALTER COLUMN "date" SET NOT NULL,
    ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP;

-- ─── Deliveries ─────────────────────────────────────────────────────────────

ALTER TABLE "deliveries"
    ADD COLUMN "purchaseOrderId" TEXT,
    ADD COLUMN "grnNumber" TEXT,
    ADD COLUMN "receivedAt" TIMESTAMP(3),
    ADD COLUMN "receivedById" TEXT,
    ADD COLUMN "notes" TEXT;

UPDATE "deliveries" d SET "purchaseOrderId" = po."id"
FROM "purchase_orders" po
WHERE po."organizationId" = d."organizationId" AND po."poNumber" = d."poNumber";

-- A delivery that never matched a purchase order has nothing to be received against.
DELETE FROM "deliveries" WHERE "purchaseOrderId" IS NULL;
ALTER TABLE "deliveries" ALTER COLUMN "purchaseOrderId" SET NOT NULL;

ALTER TABLE "deliveries" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "deliveries" ALTER COLUMN "status" TYPE "DeliveryStatus"
    USING (CASE lower("status")
        WHEN 'delivered' THEN 'RECEIVED'
        WHEN 'in_transit' THEN 'IN_TRANSIT'
        WHEN 'cancelled' THEN 'CANCELLED'
        ELSE 'SCHEDULED' END)::"DeliveryStatus";
ALTER TABLE "deliveries" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';

UPDATE "deliveries" SET "receivedAt" = COALESCE("actualDate", "scheduledDate") WHERE "status" = 'RECEIVED';
UPDATE "deliveries" SET "notes" = NULLIF("itemSummary", '');

ALTER TABLE "deliveries" ALTER COLUMN "trackingId" DROP NOT NULL,
    ALTER COLUMN "trackingId" DROP DEFAULT;
UPDATE "deliveries" SET "trackingId" = NULL WHERE "trackingId" = '';

-- Legacy receipts carried no quantities: treat the first receipt of each order as the full order.
WITH first_receipt AS (
    SELECT DISTINCT ON ("purchaseOrderId") "id", "purchaseOrderId"
    FROM "deliveries"
    WHERE "status" = 'RECEIVED'
    ORDER BY "purchaseOrderId", "receivedAt", "id"
)
INSERT INTO "delivery_items" ("id", "deliveryId", "poLineItemId", "quantity")
SELECT gen_random_uuid()::text, r."id", li."id", li."quantity"
FROM first_receipt r JOIN "po_line_items" li ON li."purchaseOrderId" = r."purchaseOrderId";

UPDATE "po_line_items" li SET "receivedQuantity" = received."quantity"
FROM (SELECT "poLineItemId", sum("quantity") AS "quantity" FROM "delivery_items" GROUP BY "poLineItemId") received
WHERE received."poLineItemId" = li."id";

UPDATE "deliveries" d SET "grnNumber" = 'GRN-' || lpad(numbered."n"::text, 4, '0')
FROM (
    SELECT "id", row_number() OVER (PARTITION BY "organizationId" ORDER BY "receivedAt", "id") AS "n"
    FROM "deliveries" WHERE "status" = 'RECEIVED'
) numbered
WHERE numbered."id" = d."id";

ALTER TABLE "deliveries"
    DROP COLUMN "poNumber",
    DROP COLUMN "vendorName",
    DROP COLUMN "projectName",
    DROP COLUMN "category",
    DROP COLUMN "actualDate",
    DROP COLUMN "itemSummary",
    DROP COLUMN "delayDays";

-- ─── RFQs ───────────────────────────────────────────────────────────────────

ALTER TABLE "rfqs"
    ADD COLUMN "description" TEXT,
    ADD COLUMN "awardedAt" TIMESTAMP(3),
    ADD COLUMN "createdById" TEXT,
    ADD COLUMN "awardedVendorId" TEXT,
    ADD COLUMN "purchaseOrderId" TEXT;

UPDATE "rfqs" r SET "createdById" = u."id"
FROM "users" u JOIN "user_organizations" uo ON uo."userId" = u."id"
WHERE uo."organizationId" = r."organizationId" AND u."name" = r."createdBy";

-- "closing_soon" is now derived from the closing date rather than stored.
ALTER TABLE "rfqs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "rfqs" ALTER COLUMN "status" TYPE "RfqStatus"
    USING (CASE lower("status")
        WHEN 'evaluating' THEN 'EVALUATING'
        WHEN 'awarded' THEN 'AWARDED'
        WHEN 'cancelled' THEN 'CANCELLED'
        ELSE 'OPEN' END)::"RfqStatus";
ALTER TABLE "rfqs" ALTER COLUMN "status" SET DEFAULT 'OPEN';

UPDATE "rfqs" SET "awardedAt" = "updatedAt" WHERE "status" = 'AWARDED';

ALTER TABLE "rfqs" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "rfqs" ALTER COLUMN "priority" TYPE "ProcurementPriority"
    USING (CASE upper("priority") WHEN 'LOW' THEN 'LOW' WHEN 'HIGH' THEN 'HIGH' WHEN 'CRITICAL' THEN 'CRITICAL' ELSE 'MEDIUM' END)::"ProcurementPriority";
ALTER TABLE "rfqs" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';

-- ─── Drop columns now derived from real records ─────────────────────────────

ALTER TABLE "vendors"
    DROP COLUMN "lastOrderDate",
    DROP COLUMN "onTimeDeliveryPercent",
    DROP COLUMN "projectCount",
    DROP COLUMN "totalOrders";

ALTER TABLE "purchase_orders"
    DROP COLUMN "approvalStatus",
    DROP COLUMN "approver",
    DROP COLUMN "createdBy",
    DROP COLUMN "deliveryStatus";

ALTER TABLE "rfqs"
    DROP COLUMN "createdBy",
    DROP COLUMN "responsesReceived",
    DROP COLUMN "vendorsInvited";

-- CreateIndex
CREATE INDEX "rfq_items_rfqId_idx" ON "rfq_items"("rfqId");
CREATE INDEX "rfq_invitations_vendorId_idx" ON "rfq_invitations"("vendorId");
CREATE UNIQUE INDEX "rfq_invitations_rfqId_vendorId_key" ON "rfq_invitations"("rfqId", "vendorId");
CREATE UNIQUE INDEX "rfq_quote_items_invitationId_rfqItemId_key" ON "rfq_quote_items"("invitationId", "rfqItemId");
CREATE INDEX "delivery_items_deliveryId_idx" ON "delivery_items"("deliveryId");
CREATE INDEX "delivery_items_poLineItemId_idx" ON "delivery_items"("poLineItemId");
CREATE INDEX "purchase_orders_organizationId_status_idx" ON "purchase_orders"("organizationId", "status");
CREATE INDEX "purchase_orders_vendorId_idx" ON "purchase_orders"("vendorId");
CREATE UNIQUE INDEX "rfqs_purchaseOrderId_key" ON "rfqs"("purchaseOrderId");
CREATE INDEX "deliveries_purchaseOrderId_idx" ON "deliveries"("purchaseOrderId");
CREATE UNIQUE INDEX "deliveries_grnNumber_organizationId_key" ON "deliveries"("grnNumber", "organizationId");

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_awardedVendorId_fkey" FOREIGN KEY ("awardedVendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rfq_items" ADD CONSTRAINT "rfq_items_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rfq_invitations" ADD CONSTRAINT "rfq_invitations_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rfq_invitations" ADD CONSTRAINT "rfq_invitations_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rfq_quote_items" ADD CONSTRAINT "rfq_quote_items_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "rfq_invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rfq_quote_items" ADD CONSTRAINT "rfq_quote_items_rfqItemId_fkey" FOREIGN KEY ("rfqItemId") REFERENCES "rfq_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "delivery_items" ADD CONSTRAINT "delivery_items_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_items" ADD CONSTRAINT "delivery_items_poLineItemId_fkey" FOREIGN KEY ("poLineItemId") REFERENCES "po_line_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
