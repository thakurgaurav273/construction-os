-- CreateEnum
CREATE TYPE "ContractDirection" AS ENUM ('CLIENT', 'SUBCONTRACT');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "BillAdjustmentEffect" AS ENUM ('ADD', 'DEDUCT');

-- CreateEnum
CREATE TYPE "BillAdjustmentCalculation" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "RaBillStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'CERTIFIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MeasurementType" AS ENUM ('DIMENSIONS', 'STEEL', 'DIRECT');

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "gstNumber" TEXT,
    "address" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "direction" "ContractDirection" NOT NULL,
    "reference" TEXT,
    "title" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "projectId" TEXT NOT NULL,
    "clientId" TEXT,
    "vendorId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_items" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "itemNo" TEXT NOT NULL,
    "rateCode" TEXT,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "rate" DECIMAL(15,2) NOT NULL,
    "isExtra" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_adjustment_rules" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "effect" "BillAdjustmentEffect" NOT NULL,
    "calculation" "BillAdjustmentCalculation" NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "contract_adjustment_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ra_bills" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "reference" TEXT,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "status" "RaBillStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT NOT NULL DEFAULT '',
    "grossAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "preparedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "certifiedById" TEXT,
    "certifiedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ra_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ra_bill_lines" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "contractItemId" TEXT NOT NULL,
    "claimedQuantity" DECIMAL(15,3) NOT NULL,
    "certifiedQuantity" DECIMAL(15,3),
    "rate" DECIMAL(15,2),
    "certificationNote" TEXT,

    CONSTRAINT "ra_bill_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ra_bill_measurements" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "contractItemId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "MeasurementType" NOT NULL,
    "nos" DECIMAL(15,4),
    "length" DECIMAL(15,4),
    "breadth" DECIMAL(15,4),
    "height" DECIMAL(15,4),
    "unitWeight" DECIMAL(15,4),
    "quantity" DECIMAL(15,3) NOT NULL,
    "isDeduction" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ra_bill_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ra_bill_adjustments" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "effect" "BillAdjustmentEffect" NOT NULL,
    "calculation" "BillAdjustmentCalculation" NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ra_bill_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ra_bill_events" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ra_bill_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clients_organizationId_idx" ON "clients"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_organizationId_name_key" ON "clients"("organizationId", "name");

-- CreateIndex
CREATE INDEX "contracts_organizationId_direction_idx" ON "contracts"("organizationId", "direction");

-- CreateIndex
CREATE INDEX "contracts_projectId_idx" ON "contracts"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_organizationId_code_key" ON "contracts"("organizationId", "code");

-- CreateIndex
CREATE INDEX "contract_items_contractId_idx" ON "contract_items"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_items_contractId_itemNo_key" ON "contract_items"("contractId", "itemNo");

-- CreateIndex
CREATE INDEX "contract_adjustment_rules_contractId_idx" ON "contract_adjustment_rules"("contractId");

-- CreateIndex
CREATE INDEX "ra_bills_organizationId_status_idx" ON "ra_bills"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ra_bills_projectId_idx" ON "ra_bills"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ra_bills_contractId_sequence_key" ON "ra_bills"("contractId", "sequence");

-- CreateIndex
CREATE INDEX "ra_bill_lines_contractItemId_idx" ON "ra_bill_lines"("contractItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ra_bill_lines_billId_contractItemId_key" ON "ra_bill_lines"("billId", "contractItemId");

-- CreateIndex
CREATE INDEX "ra_bill_measurements_billId_contractItemId_idx" ON "ra_bill_measurements"("billId", "contractItemId");

-- CreateIndex
CREATE INDEX "ra_bill_adjustments_billId_idx" ON "ra_bill_adjustments"("billId");

-- CreateIndex
CREATE INDEX "ra_bill_events_billId_idx" ON "ra_bill_events"("billId");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_items" ADD CONSTRAINT "contract_items_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_adjustment_rules" ADD CONSTRAINT "contract_adjustment_rules_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ra_bills" ADD CONSTRAINT "ra_bills_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ra_bills" ADD CONSTRAINT "ra_bills_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ra_bills" ADD CONSTRAINT "ra_bills_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ra_bills" ADD CONSTRAINT "ra_bills_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ra_bills" ADD CONSTRAINT "ra_bills_certifiedById_fkey" FOREIGN KEY ("certifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ra_bill_lines" ADD CONSTRAINT "ra_bill_lines_billId_fkey" FOREIGN KEY ("billId") REFERENCES "ra_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ra_bill_lines" ADD CONSTRAINT "ra_bill_lines_contractItemId_fkey" FOREIGN KEY ("contractItemId") REFERENCES "contract_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ra_bill_measurements" ADD CONSTRAINT "ra_bill_measurements_billId_fkey" FOREIGN KEY ("billId") REFERENCES "ra_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ra_bill_measurements" ADD CONSTRAINT "ra_bill_measurements_contractItemId_fkey" FOREIGN KEY ("contractItemId") REFERENCES "contract_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ra_bill_adjustments" ADD CONSTRAINT "ra_bill_adjustments_billId_fkey" FOREIGN KEY ("billId") REFERENCES "ra_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ra_bill_events" ADD CONSTRAINT "ra_bill_events_billId_fkey" FOREIGN KEY ("billId") REFERENCES "ra_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

