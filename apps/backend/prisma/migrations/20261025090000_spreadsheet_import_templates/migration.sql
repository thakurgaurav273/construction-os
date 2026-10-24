-- CreateEnum
CREATE TYPE "ImportEntity" AS ENUM ('MATERIAL', 'VENDOR', 'OPENING_STOCK', 'PURCHASE_ORDER');

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "externalReference" TEXT;

-- CreateTable
CREATE TABLE "import_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entity" "ImportEntity" NOT NULL,
    "headerSignature" TEXT NOT NULL,
    "headerRow" INTEGER NOT NULL,
    "headers" TEXT[],
    "mapping" JSONB NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_templates_organizationId_entity_headerSignature_idx" ON "import_templates"("organizationId", "entity", "headerSignature");

-- CreateIndex
CREATE UNIQUE INDEX "import_templates_organizationId_entity_name_key" ON "import_templates"("organizationId", "entity", "name");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_externalReference_organizationId_key" ON "purchase_orders"("externalReference", "organizationId");

-- AddForeignKey
ALTER TABLE "import_templates" ADD CONSTRAINT "import_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

