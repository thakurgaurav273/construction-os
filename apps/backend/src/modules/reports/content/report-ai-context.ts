import { formatValue, periodLabel, projectsLabel } from '../render/report-format';
import type { ReportDocument } from './report-document';

/** Enough rows for the model to spot what stands out without sending whole tables. */
const ROWS_PER_TABLE = 15;

/** The report as compact text for the summary prompt, with values formatted as people will read them. */
export function reportAiContext(document: ReportDocument, currency: string): string {
  const lines = [
    `Report: ${document.title} (${document.type})`,
    `Organization: ${document.organizationName}`,
    `Period: ${periodLabel(document.period)}`,
    `Projects: ${projectsLabel(document.projectNames, document.allProjects)}`,
    '',
    'Headline figures:',
    ...document.metrics.map((metric) => `- ${metric.label}: ${formatValue(metric.value, metric.kind, currency)}`),
  ];
  for (const section of document.sections) {
    lines.push('', `${section.title}:`);
    section.bullets?.forEach((bullet) => lines.push(`- ${bullet}`));
    const table = section.table;
    if (!table) continue;
    if (table.rows.length === 0) {
      lines.push(table.emptyText);
      continue;
    }
    lines.push(table.columns.map((column) => column.label).join(' | '));
    for (const row of table.rows.slice(0, ROWS_PER_TABLE)) {
      lines.push(table.columns.map((column) => formatValue(row[column.key] ?? null, column.kind, currency)).join(' | '));
    }
    if (table.rows.length > ROWS_PER_TABLE) lines.push(`… and ${table.rows.length - ROWS_PER_TABLE} more rows`);
  }
  return lines.join('\n');
}
