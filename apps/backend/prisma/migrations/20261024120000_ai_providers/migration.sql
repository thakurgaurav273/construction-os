-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('GEMINI', 'GROQ', 'HUGGINGFACE');

-- CreateEnum
CREATE TYPE "AiKeySource" AS ENUM ('ORGANIZATION', 'PLATFORM');

-- CreateEnum
CREATE TYPE "AiAccessRequestKind" AS ENUM ('TRIAL', 'TOP_UP');

-- CreateEnum
CREATE TYPE "AiAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ai_credentials" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "keyHint" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_org_settings" (
    "organizationId" TEXT NOT NULL,
    "activeProvider" "AiProvider",
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_org_settings_pkey" PRIMARY KEY ("organizationId")
);

-- CreateTable
CREATE TABLE "platform_ai_credentials" (
    "provider" "AiProvider" NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "keyHint" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lastVerifiedAt" TIMESTAMP(3),
    "updatedByEmail" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_ai_credentials_pkey" PRIMARY KEY ("provider")
);

-- CreateTable
CREATE TABLE "ai_access_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "AiAccessRequestKind" NOT NULL,
    "status" "AiAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedRequests" INTEGER NOT NULL,
    "reason" TEXT,
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedByEmail" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "grantedRequests" INTEGER,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ai_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "source" "AiKeySource" NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorCode" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_insight_snapshots" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_insight_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_credentials_organizationId_provider_key" ON "ai_credentials"("organizationId", "provider");

-- CreateIndex
CREATE INDEX "ai_access_requests_status_createdAt_idx" ON "ai_access_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ai_access_requests_organizationId_status_idx" ON "ai_access_requests"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ai_usage_organizationId_createdAt_idx" ON "ai_usage"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_organizationId_source_success_createdAt_idx" ON "ai_usage"("organizationId", "source", "success", "createdAt");

-- CreateIndex
CREATE INDEX "ai_insight_snapshots_organizationId_createdAt_idx" ON "ai_insight_snapshots"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_credentials" ADD CONSTRAINT "ai_credentials_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_org_settings" ADD CONSTRAINT "ai_org_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_access_requests" ADD CONSTRAINT "ai_access_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_access_requests" ADD CONSTRAINT "ai_access_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_insight_snapshots" ADD CONSTRAINT "ai_insight_snapshots_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

