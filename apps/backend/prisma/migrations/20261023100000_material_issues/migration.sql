-- CreateEnum
CREATE TYPE "MaterialIssueType" AS ENUM ('ISSUE', 'RETURN');

-- CreateTable
CREATE TABLE "material_issues" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "MaterialIssueType" NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unitCost" DECIMAL(15,2) NOT NULL,
    "note" TEXT,
    "issuedOn" TIMESTAMP(3) NOT NULL,
    "materialId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "material_issues_organizationId_idx" ON "material_issues"("organizationId");

-- CreateIndex
CREATE INDEX "material_issues_projectId_issuedOn_idx" ON "material_issues"("projectId", "issuedOn");

-- CreateIndex
CREATE INDEX "material_issues_materialId_idx" ON "material_issues"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "material_issues_code_organizationId_key" ON "material_issues"("code", "organizationId");

-- AddForeignKey
ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

