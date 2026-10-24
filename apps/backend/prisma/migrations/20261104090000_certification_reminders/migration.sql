-- CreateEnum
CREATE TYPE "CertificationReminderStage" AS ENUM ('EXPIRING_SOON', 'EXPIRING_THIS_WEEK', 'EXPIRED');

-- AlterTable
ALTER TABLE "worker_certifications" ADD COLUMN     "remindedStage" "CertificationReminderStage";

