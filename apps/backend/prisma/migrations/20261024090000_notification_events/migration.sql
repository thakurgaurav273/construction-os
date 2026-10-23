-- Notifications now record what caused them and where they lead.
ALTER TABLE "notifications" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN "event" TEXT,
ADD COLUMN "link" TEXT;

CREATE INDEX "notifications_userId_organizationId_createdAt_idx" ON "notifications"("userId", "organizationId", "createdAt");

-- The previous notification_preferences table (check-ins, recognition, goals…) was never read or written by the app.
-- It is replaced by one row per member, organization and notification category.
DROP TABLE "notification_preferences";

CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_preferences_userId_organizationId_category_key" ON "notification_preferences"("userId", "organizationId", "category");

ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
