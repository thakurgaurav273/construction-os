-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ImportEntity" ADD VALUE 'BOQ';
ALTER TYPE "ImportEntity" ADD VALUE 'MEASUREMENT_BOOK';

-- AlterTable
ALTER TABLE "ra_bills" ADD COLUMN     "isOpeningBalance" BOOLEAN NOT NULL DEFAULT false;

