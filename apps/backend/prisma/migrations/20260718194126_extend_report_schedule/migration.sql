/*
  Warnings:

  - Added the required column `reportType` to the `report_schedules` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "report_schedules" ADD COLUMN     "cronExpression" TEXT,
ADD COLUMN     "emails" TEXT[],
ADD COLUMN     "includeAiSummary" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "outputFormat" TEXT NOT NULL DEFAULT 'PDF',
ADD COLUMN     "reportType" TEXT NOT NULL,
ADD COLUMN     "time" TEXT NOT NULL DEFAULT '09:00',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';
