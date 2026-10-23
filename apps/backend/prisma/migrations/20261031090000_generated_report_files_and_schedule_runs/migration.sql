-- AlterTable
ALTER TABLE "generated_reports" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "error" TEXT,
ADD COLUMN     "excelKey" TEXT,
ADD COLUMN     "pdfKey" TEXT,
ADD COLUMN     "periodFrom" TIMESTAMP(3),
ADD COLUMN     "periodTo" TIMESTAMP(3),
ADD COLUMN     "projectIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "scheduleId" TEXT;

-- AlterTable
ALTER TABLE "report_schedules" ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "lastStatus" TEXT;


-- Schedule recipients become organization roles instead of free-text labels; addresses typed there move to emails.
UPDATE "report_schedules" SET "emails" = "emails" || ARRAY(
  SELECT label FROM unnest("recipients") AS label WHERE label LIKE '%@%' AND NOT label = ANY("emails")
);
UPDATE "report_schedules" SET "recipients" = ARRAY(
  SELECT DISTINCT CASE label
    WHEN 'Project Manager' THEN 'PROJECT_MANAGER'
    WHEN 'Finance Manager' THEN 'FINANCE'
    WHEN 'Director' THEN 'ADMIN'
    WHEN 'CEO' THEN 'OWNER'
    ELSE label
  END
  FROM unnest("recipients") AS label
  WHERE label IN ('Project Manager', 'Finance Manager', 'Director', 'CEO', 'OWNER', 'ADMIN', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'STORE_MANAGER', 'PROCUREMENT', 'FINANCE', 'VIEWER')
);
