-- Existing tokens become one session each; their device details are unknown.
ALTER TABLE "refresh_tokens" ADD COLUMN "ipAddress" TEXT,
ADD COLUMN "sessionId" TEXT,
ADD COLUMN "sessionStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "userAgent" TEXT;

UPDATE "refresh_tokens" SET "sessionId" = "id", "sessionStartedAt" = "createdAt";

ALTER TABLE "refresh_tokens" ALTER COLUMN "sessionId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "refresh_tokens_sessionId_idx" ON "refresh_tokens"("sessionId");
