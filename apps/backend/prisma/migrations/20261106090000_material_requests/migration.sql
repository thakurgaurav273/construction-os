-- CreateEnum
CREATE TYPE "MaterialRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'PARTLY_ISSUED', 'ISSUED', 'REJECTED', 'CANCELLED', 'CLOSED');

-- AlterTable
ALTER TABLE "material_issues" ADD COLUMN     "requestItemId" TEXT;

-- CreateTable
CREATE TABLE "material_requests" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "MaterialRequestStatus" NOT NULL DEFAULT 'PENDING',
    "neededBy" DATE,
    "note" TEXT,
    "reviewNote" TEXT,
    "projectId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_request_items" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "issuedQuantity" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "material_requests_organizationId_status_idx" ON "material_requests"("organizationId", "status");

-- CreateIndex
CREATE INDEX "material_requests_projectId_createdAt_idx" ON "material_requests"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "material_requests_code_organizationId_key" ON "material_requests"("code", "organizationId");

-- CreateIndex
CREATE INDEX "material_request_items_materialId_idx" ON "material_request_items"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "material_request_items_requestId_materialId_key" ON "material_request_items"("requestId", "materialId");

-- CreateIndex
CREATE INDEX "material_issues_requestItemId_idx" ON "material_issues"("requestItemId");

-- AddForeignKey
ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_requestItemId_fkey" FOREIGN KEY ("requestItemId") REFERENCES "material_request_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "material_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

