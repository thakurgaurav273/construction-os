-- AlterTable
ALTER TABLE "ai_insight_snapshots" ADD COLUMN     "areas" TEXT[] DEFAULT ARRAY[]::TEXT[];

