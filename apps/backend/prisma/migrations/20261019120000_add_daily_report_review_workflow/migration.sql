-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.
ALTER TYPE "DailyReportStatus" ADD VALUE 'APPROVED';
ALTER TYPE "DailyReportStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "daily_reports" ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- Backfill: reports submitted before the review workflow existed
UPDATE "daily_reports" SET "submittedAt" = "createdAt" WHERE "status" = 'SUBMITTED';

-- CreateIndex
CREATE INDEX "daily_reports_organizationId_status_idx" ON "daily_reports"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
