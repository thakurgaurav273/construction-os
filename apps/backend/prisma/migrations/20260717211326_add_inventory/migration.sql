-- CreateEnum
CREATE TYPE "WarehouseType" AS ENUM ('CENTRAL', 'SITE_STORE', 'YARD', 'TRANSIT');

-- CreateEnum
CREATE TYPE "StockTransferStatus" AS ENUM ('PENDING', 'APPROVED', 'IN_TRANSIT', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryTransactionType" AS ENUM ('RECEIVE', 'ISSUE', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'CONSUMPTION', 'RETURN', 'DAMAGE');

-- CreateEnum
CREATE TYPE "StockAdjustmentReason" AS ENUM ('CYCLE_COUNT', 'DAMAGE', 'LOSS', 'FOUND', 'CORRECTION', 'RETURN');

-- CreateEnum
CREATE TYPE "StockReservationStatus" AS ENUM ('ACTIVE', 'RELEASED', 'CONSUMED');

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "WarehouseType" NOT NULL DEFAULT 'SITE_STORE',
    "address" TEXT,
    "city" TEXT,
    "manager" TEXT,
    "capacity" DECIMAL(15,3),
    "projectId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "zone" TEXT,
    "warehouseId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "locationId" TEXT,
    "quantity" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "reserved" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "damaged" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "incoming" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "reorderLevel" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "type" "InventoryTransactionType" NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unitCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "reference" TEXT,
    "note" TEXT,
    "inventoryItemId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "projectId" TEXT,
    "transferId" TEXT,
    "organizationId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "StockTransferStatus" NOT NULL DEFAULT 'PENDING',
    "fromWarehouseId" TEXT NOT NULL,
    "toWarehouseId" TEXT NOT NULL,
    "note" TEXT,
    "requestedBy" TEXT,
    "approvedBy" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfer_items" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "reason" "StockAdjustmentReason" NOT NULL,
    "quantityBefore" DECIMAL(15,3) NOT NULL,
    "quantityAfter" DECIMAL(15,3) NOT NULL,
    "delta" DECIMAL(15,3) NOT NULL,
    "note" TEXT,
    "adjustedBy" TEXT,
    "inventoryItemId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_reservations" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "status" "StockReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "projectId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_audits" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "note" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "warehouses_organizationId_idx" ON "warehouses"("organizationId");

-- CreateIndex
CREATE INDEX "warehouses_organizationId_deletedAt_idx" ON "warehouses"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "warehouses_projectId_idx" ON "warehouses"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_organizationId_key" ON "warehouses"("code", "organizationId");

-- CreateIndex
CREATE INDEX "warehouse_locations_warehouseId_idx" ON "warehouse_locations"("warehouseId");

-- CreateIndex
CREATE INDEX "warehouse_locations_organizationId_idx" ON "warehouse_locations"("organizationId");

-- CreateIndex
CREATE INDEX "inventory_items_organizationId_idx" ON "inventory_items"("organizationId");

-- CreateIndex
CREATE INDEX "inventory_items_warehouseId_idx" ON "inventory_items"("warehouseId");

-- CreateIndex
CREATE INDEX "inventory_items_materialId_idx" ON "inventory_items"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_materialId_warehouseId_key" ON "inventory_items"("materialId", "warehouseId");

-- CreateIndex
CREATE INDEX "inventory_transactions_organizationId_idx" ON "inventory_transactions"("organizationId");

-- CreateIndex
CREATE INDEX "inventory_transactions_warehouseId_idx" ON "inventory_transactions"("warehouseId");

-- CreateIndex
CREATE INDEX "inventory_transactions_materialId_idx" ON "inventory_transactions"("materialId");

-- CreateIndex
CREATE INDEX "inventory_transactions_projectId_idx" ON "inventory_transactions"("projectId");

-- CreateIndex
CREATE INDEX "inventory_transactions_occurredAt_idx" ON "inventory_transactions"("occurredAt");

-- CreateIndex
CREATE INDEX "stock_transfers_organizationId_idx" ON "stock_transfers"("organizationId");

-- CreateIndex
CREATE INDEX "stock_transfers_status_idx" ON "stock_transfers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfers_code_organizationId_key" ON "stock_transfers"("code", "organizationId");

-- CreateIndex
CREATE INDEX "stock_transfer_items_transferId_idx" ON "stock_transfer_items"("transferId");

-- CreateIndex
CREATE INDEX "stock_transfer_items_organizationId_idx" ON "stock_transfer_items"("organizationId");

-- CreateIndex
CREATE INDEX "stock_adjustments_organizationId_idx" ON "stock_adjustments"("organizationId");

-- CreateIndex
CREATE INDEX "stock_adjustments_warehouseId_idx" ON "stock_adjustments"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_adjustments_code_organizationId_key" ON "stock_adjustments"("code", "organizationId");

-- CreateIndex
CREATE INDEX "stock_reservations_organizationId_idx" ON "stock_reservations"("organizationId");

-- CreateIndex
CREATE INDEX "stock_reservations_inventoryItemId_idx" ON "stock_reservations"("inventoryItemId");

-- CreateIndex
CREATE INDEX "inventory_audits_organizationId_idx" ON "inventory_audits"("organizationId");

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_locations" ADD CONSTRAINT "warehouse_locations_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_locations" ADD CONSTRAINT "warehouse_locations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "warehouse_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "stock_transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "stock_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_audits" ADD CONSTRAINT "inventory_audits_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
