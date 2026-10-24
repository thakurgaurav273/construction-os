-- Certifications move from a JSON list on each worker (with a typed-in status that went stale) to their own
-- table. Status is now derived from the expiry date, so the old "status" values are not carried over.

-- CreateTable
CREATE TABLE "worker_certifications" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "certificateNumber" TEXT,
    "issuedOn" DATE,
    "expiresOn" DATE,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "worker_certifications_workerId_idx" ON "worker_certifications"("workerId");

-- CreateIndex
CREATE INDEX "worker_certifications_organizationId_expiresOn_idx" ON "worker_certifications"("organizationId", "expiresOn");

-- AddForeignKey
ALTER TABLE "worker_certifications" ADD CONSTRAINT "worker_certifications_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_certifications" ADD CONSTRAINT "worker_certifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Copy existing entries: keep the name and a well-formed YYYY-MM-DD expiry; skip entries without a name.
INSERT INTO "worker_certifications" ("id", "workerId", "organizationId", "name", "expiresOn", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    w."id",
    w."organizationId",
    btrim(entry->>'name'),
    CASE WHEN (entry->>'expiryDate') ~ '^\d{4}-\d{2}-\d{2}$' THEN (entry->>'expiryDate')::date END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "workers" w
CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(w."certifications") = 'array' THEN w."certifications" ELSE '[]'::jsonb END
) AS entry
WHERE jsonb_typeof(entry) = 'object' AND coalesce(btrim(entry->>'name'), '') <> '';

-- AlterTable
ALTER TABLE "workers" DROP COLUMN "certifications";
