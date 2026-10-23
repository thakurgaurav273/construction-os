-- CreateEnum
CREATE TYPE "BillAdjustmentKind" AS ENUM ('MANUAL', 'MATERIAL_RECOVERY');

-- AlterTable
ALTER TABLE "material_issues" ADD COLUMN     "contractId" TEXT,
ADD COLUMN     "recoveryAdjustmentId" TEXT,
ADD COLUMN     "recoveryRate" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "contract_items" ADD COLUMN     "clientItemId" TEXT;

-- AlterTable
ALTER TABLE "ra_bill_adjustments" ADD COLUMN     "kind" "BillAdjustmentKind" NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX "material_issues_contractId_idx" ON "material_issues"("contractId");

-- AddForeignKey
ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_recoveryAdjustmentId_fkey" FOREIGN KEY ("recoveryAdjustmentId") REFERENCES "ra_bill_adjustments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_items" ADD CONSTRAINT "contract_items_clientItemId_fkey" FOREIGN KEY ("clientItemId") REFERENCES "contract_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

