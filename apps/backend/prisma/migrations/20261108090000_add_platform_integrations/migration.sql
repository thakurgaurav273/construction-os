-- CreateEnum
CREATE TYPE "PlatformIntegrationKind" AS ENUM ('STORAGE', 'EMAIL');

-- CreateTable
CREATE TABLE "platform_integrations" (
    "kind" "PlatformIntegrationKind" NOT NULL,
    "provider" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "secretHint" TEXT NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL,
    "updatedByEmail" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_integrations_pkey" PRIMARY KEY ("kind")
);

