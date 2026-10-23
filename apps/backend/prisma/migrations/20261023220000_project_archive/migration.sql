-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedFromStatus" "ProjectStatus",
ADD COLUMN     "deletedById" TEXT;

