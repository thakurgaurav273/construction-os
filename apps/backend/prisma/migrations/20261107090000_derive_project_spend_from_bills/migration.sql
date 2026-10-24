-- A project's spend is now derived from its approved, part-paid and paid vendor bills (projectSpend), the same
-- figure Finance and the budget heads use, so the typed-in column goes.
-- AlterTable
ALTER TABLE "projects" DROP COLUMN "spent";
