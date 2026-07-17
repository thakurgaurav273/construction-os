-- CreateEnum
CREATE TYPE "MaterialMovementType" AS ENUM ('INBOUND', 'OUTBOUND', 'TRANSFER', 'CONSUMPTION', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "material_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 7,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "onTimeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openPurchaseOrders" INTEGER NOT NULL DEFAULT 0,
    "totalSpend" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "unitCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "quantity" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "reserved" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "incoming" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "minStock" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "maxStock" DECIMAL(15,3),
    "warehouse" TEXT,
    "imageUrl" TEXT,
    "specifications" JSONB,
    "categoryId" TEXT,
    "supplierId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_movements" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "type" "MaterialMovementType" NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "projectId" TEXT,
    "organizationId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_project_usages" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "allocated" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "consumed" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_project_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "material_categories_organizationId_idx" ON "material_categories"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "material_categories_name_organizationId_key" ON "material_categories"("name", "organizationId");

-- CreateIndex
CREATE INDEX "material_suppliers_organizationId_idx" ON "material_suppliers"("organizationId");

-- CreateIndex
CREATE INDEX "materials_organizationId_idx" ON "materials"("organizationId");

-- CreateIndex
CREATE INDEX "materials_organizationId_categoryId_idx" ON "materials"("organizationId", "categoryId");

-- CreateIndex
CREATE INDEX "materials_organizationId_supplierId_idx" ON "materials"("organizationId", "supplierId");

-- CreateIndex
CREATE INDEX "materials_organizationId_deletedAt_idx" ON "materials"("organizationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "materials_sku_organizationId_key" ON "materials"("sku", "organizationId");

-- CreateIndex
CREATE INDEX "material_movements_organizationId_idx" ON "material_movements"("organizationId");

-- CreateIndex
CREATE INDEX "material_movements_materialId_idx" ON "material_movements"("materialId");

-- CreateIndex
CREATE INDEX "material_movements_projectId_idx" ON "material_movements"("projectId");

-- CreateIndex
CREATE INDEX "material_movements_occurredAt_idx" ON "material_movements"("occurredAt");

-- CreateIndex
CREATE INDEX "material_project_usages_organizationId_idx" ON "material_project_usages"("organizationId");

-- CreateIndex
CREATE INDEX "material_project_usages_materialId_idx" ON "material_project_usages"("materialId");

-- CreateIndex
CREATE INDEX "material_project_usages_projectId_idx" ON "material_project_usages"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "material_project_usages_materialId_projectId_key" ON "material_project_usages"("materialId", "projectId");

-- AddForeignKey
ALTER TABLE "material_categories" ADD CONSTRAINT "material_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_suppliers" ADD CONSTRAINT "material_suppliers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "material_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "material_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_movements" ADD CONSTRAINT "material_movements_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_movements" ADD CONSTRAINT "material_movements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_movements" ADD CONSTRAINT "material_movements_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_project_usages" ADD CONSTRAINT "material_project_usages_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_project_usages" ADD CONSTRAINT "material_project_usages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_project_usages" ADD CONSTRAINT "material_project_usages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
