-- Who requested, approved and completed a transfer, and who adjusted stock, now come from the signed-in
-- user instead of free text sent by the client. Existing rows are attributed to the organization's owner.

-- AlterTable
ALTER TABLE "stock_transfers"
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "completedById" TEXT,
ADD COLUMN     "requestedById" TEXT,
ADD COLUMN     "reviewNote" TEXT;

ALTER TABLE "stock_adjustments" ADD COLUMN "adjustedById" TEXT;

UPDATE "stock_transfers" t
SET "requestedById" = (
  SELECT uo."userId" FROM "user_organizations" uo
  WHERE uo."organizationId" = t."organizationId" AND uo."role" = 'OWNER'
  ORDER BY uo."joinedAt" LIMIT 1
);
UPDATE "stock_transfers" t
SET "approvedById" = t."requestedById"
WHERE t."approvedAt" IS NOT NULL;
UPDATE "stock_transfers" t
SET "completedById" = t."requestedById"
WHERE t."completedAt" IS NOT NULL;

UPDATE "stock_adjustments" a
SET "adjustedById" = (
  SELECT uo."userId" FROM "user_organizations" uo
  WHERE uo."organizationId" = a."organizationId" AND uo."role" = 'OWNER'
  ORDER BY uo."joinedAt" LIMIT 1
);

ALTER TABLE "stock_transfers" ALTER COLUMN "requestedById" SET NOT NULL;
ALTER TABLE "stock_adjustments" ALTER COLUMN "adjustedById" SET NOT NULL;

ALTER TABLE "stock_transfers" DROP COLUMN "approvedBy", DROP COLUMN "requestedBy";
ALTER TABLE "stock_adjustments" DROP COLUMN "adjustedBy";

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_locations_warehouseId_code_key" ON "warehouse_locations"("warehouseId", "code");

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_adjustedById_fkey" FOREIGN KEY ("adjustedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
