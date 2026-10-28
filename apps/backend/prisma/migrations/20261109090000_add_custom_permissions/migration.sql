-- AlterTable
ALTER TABLE "user_organizations" ADD COLUMN     "grantedPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "revokedPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "org_role_permissions" (
    "organizationId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL,
    "granted" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "revoked" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_role_permissions_pkey" PRIMARY KEY ("organizationId","role")
);

-- AddForeignKey
ALTER TABLE "org_role_permissions" ADD CONSTRAINT "org_role_permissions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

