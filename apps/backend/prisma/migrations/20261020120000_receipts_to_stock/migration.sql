-- AlterTable
ALTER TABLE "po_line_items" ADD COLUMN     "materialId" TEXT;

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "warehouseId" TEXT;

-- CreateIndex
CREATE INDEX "po_line_items_materialId_idx" ON "po_line_items"("materialId");

-- AddForeignKey
ALTER TABLE "po_line_items" ADD CONSTRAINT "po_line_items_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

