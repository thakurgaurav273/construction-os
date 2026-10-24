-- CreateEnum
CREATE TYPE "HelpProgressStatus" AS ENUM ('COMPLETED', 'SKIPPED');

-- CreateTable
CREATE TABLE "help_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" "HelpProgressStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "help_progress_userId_organizationId_key_key" ON "help_progress"("userId", "organizationId", "key");

-- AddForeignKey
ALTER TABLE "help_progress" ADD CONSTRAINT "help_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_progress" ADD CONSTRAINT "help_progress_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

