-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'ABSENT', 'LATE');

-- CreateEnum
CREATE TYPE "WorkerType" AS ENUM ('EMPLOYEE', 'SUBCONTRACTOR');

-- CreateEnum
CREATE TYPE "WorkerShift" AS ENUM ('DAY', 'NIGHT');

-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "type" "WorkerType" NOT NULL DEFAULT 'EMPLOYEE',
    "phone" TEXT,
    "email" TEXT,
    "status" "WorkerStatus" NOT NULL DEFAULT 'ACTIVE',
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "shift" "WorkerShift" NOT NULL DEFAULT 'DAY',
    "attendancePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastCheckIn" TEXT,
    "supervisor" TEXT,
    "projectId" TEXT,
    "emergencyContact" JSONB,
    "skills" TEXT[],
    "certifications" JSONB,
    "ppeCompliant" BOOLEAN NOT NULL DEFAULT true,
    "weeklyAttendance" JSONB,
    "recentActivity" JSONB,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workers_organizationId_idx" ON "workers"("organizationId");

-- CreateIndex
CREATE INDEX "workers_projectId_idx" ON "workers"("projectId");

-- CreateIndex
CREATE INDEX "workers_organizationId_status_idx" ON "workers"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
