/*
  Attendance moves from static per-worker fields to one record per worker per day.

  Dropped from "workers": status, attendancePercent, lastCheckIn, weeklyAttendance, recentActivity.
  These held fixed placeholder values written by the seed script and were never updated by the app;
  today's status, attendance %, last check-in and weekly view are now derived from "attendance_records".
*/
-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'ON_LEAVE');

-- DropIndex
DROP INDEX "workers_organizationId_status_idx";

-- AlterTable
ALTER TABLE "workers" DROP COLUMN "attendancePercent",
DROP COLUMN "lastCheckIn",
DROP COLUMN "recentActivity",
DROP COLUMN "status",
DROP COLUMN "weeklyAttendance",
ADD COLUMN     "deactivatedAt" TIMESTAMP(3);

-- DropEnum
DROP TYPE "WorkerStatus";

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "hoursWorked" DOUBLE PRECISION,
    "notes" TEXT,
    "markedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_records_organizationId_date_idx" ON "attendance_records"("organizationId", "date");

-- CreateIndex
CREATE INDEX "attendance_records_projectId_date_idx" ON "attendance_records"("projectId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_workerId_date_key" ON "attendance_records"("workerId", "date");

-- CreateIndex
CREATE INDEX "workers_organizationId_deactivatedAt_idx" ON "workers"("organizationId", "deactivatedAt");

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

