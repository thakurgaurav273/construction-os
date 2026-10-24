import PdfPrinter from 'pdfmake';
import vfs from 'pdfmake/build/vfs_fonts';
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { ReportDocument, ReportMetric, ReportSection, ReportTable } from '../content/report-document';
import { ReportBranding, formatValue, generatedAtLabel, periodLabel, projectsLabel, tint } from './report-format';

/** Roboto ships with pdfmake and covers ₹ and the other currency symbols organizations use. */
const font = (file: string): Buffer => Buffer.from(vfs[file], 'base64');
const printer = new PdfPrinter({
  Roboto: {
    normal: font('Roboto-Regular.ttf'),
    bold: font('Roboto-Medium.ttf'),
    italics: font('Roboto-Italic.ttf'),
    bolditalics: font('Roboto-MediumItalic.ttf'),
  },
});

/** Wider tables switch the whole document to landscape. */
const LANDSCAPE_COLUMNS = 6;
/** Long tables make unreadable PDFs; the Excel file is where people go for every row. */
export const PDF_TABLE_ROWS = 200;
/** Sections up to this many rows move whole to the next page rather than leaving a heading stranded. */
const KEEP_TOGETHER_ROWS = 15;
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const TONE_COLORS: Record<NonNullable<ReportMetric['tone']>, string> = { bad: '#DC2626', good: '#16A34A' };

function header(document: ReportDocument, branding: ReportBranding): Content {
  const identity: Content[] = [];
  if (branding.logo) identity.push({ image: `data:image/png;base64,${branding.logo.toString('base64')}`, fit: [40, 40], width: 40 });
  identity.push({
    stack: [
      { text: branding.organizationName, bold: true, fontSize: 11 },
      { text: `${periodLabel(document.period)} · ${projectsLabel(document.projectNames, document.allProjects)}`, color: MUTED, fontSize: 8, margin: [0, 2, 0, 0] },
    ],
    margin: [branding.logo ? 8 : 0, branding.logo ? 8 : 0, 0, 0],
  });
  return {
    stack: [
      { columns: identity, columnGap: 0 },
      { canvas: [{ type: 'rect', x: 0, y: 0, w: 60, h: 3, color: branding.brandColor }], margin: [0, 14, 0, 8] },
      { text: document.title, fontSize: 20, bold: true },
      { text: document.subtitle, color: MUTED, fontSize: 10, margin: [0, 4, 0, 16] },
    ],
  };
}

function metricCell(metric: ReportMetric, currency: string): TableCell {
  const color = metric.tone ? TONE_COLORS[metric.tone] : undefined;
  return {
    stack: [
      { text: metric.label.toUpperCase(), fontSize: 7, color: MUTED, characterSpacing: 0.4 },
      { text: formatValue(metric.value, metric.kind, currency), fontSize: 14, bold: true, color, margin: [0, 4, 0, 0] },
      ...(metric.hint ? [{ text: metric.hint, fontSize: 7, color: MUTED, margin: [0, 2, 0, 0] } satisfies Content] : []),
    ],
    margin: [8, 8, 8, 8],
  };
}

function metrics(document: ReportDocument, currency: string): Content {
  if (document.metrics.length === 0) return { text: '' };
  return {
    table: { widths: document.metrics.map(() => '*'), body: [document.metrics.map((metric) => metricCell(metric, currency))] },
    layout: { hLineColor: () => BORDER, vLineColor: () => BORDER },
    margin: [0, 0, 0, 16],
  };
}

function aiSummary(document: ReportDocument, branding: ReportBranding): Content {
  if (!document.aiSummary) return { text: '' };
  return {
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: 'SUMMARY', fontSize: 7, bold: true, color: branding.brandColor, characterSpacing: 0.4 },
          { text: document.aiSummary, fontSize: 9, lineHeight: 1.3, margin: [0, 4, 0, 0] },
        ],
        margin: [10, 8, 10, 8],
        fillColor: tint(branding.brandColor, 0.92),
      }]],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 16],
  };
}

function dataTable(table: ReportTable, branding: ReportBranding): Content {
  if (table.rows.length === 0) return { text: table.emptyText, color: MUTED, italics: true, fontSize: 9, margin: [0, 2, 0, 0] };
  const alignment = (kind: string): 'left' | 'right' => (kind === 'text' || kind === 'date' ? 'left' : 'right');
  const headRow: TableCell[] = table.columns.map((column) => ({
    text: column.label, bold: true, fontSize: 8, alignment: alignment(column.kind), fillColor: tint(branding.brandColor, 0.88),
  }));
  const bodyRows: TableCell[][] = table.rows.slice(0, PDF_TABLE_ROWS).map((row) => table.columns.map((column) => ({
    text: formatValue(row[column.key] ?? null, column.kind, branding.currency), fontSize: 8, alignment: alignment(column.kind),
  })));
  const totalsRow: TableCell[][] = table.totals
    ? [table.columns.map((column) => ({
      text: table.totals?.[column.key] === undefined ? '' : formatValue(table.totals[column.key], column.kind, branding.currency),
      bold: true, fontSize: 8, alignment: alignment(column.kind),
    }))]
    : [];
  const content: Content[] = [{
    table: {
      headerRows: 1,
      dontBreakRows: true,
      widths: table.columns.map((column, index) => (index === 0 || column.key === 'description' ? '*' : 'auto')),
      body: [headRow, ...bodyRows, ...totalsRow],
    },
    layout: {
      hLineColor: () => BORDER,
      vLineWidth: () => 0,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
  }];
  const hiddenRows = Math.max(0, table.rows.length - PDF_TABLE_ROWS);
  if (hiddenRows > 0) {
    content.push({ text: `${hiddenRows} more rows are in the Excel version of this report.`, color: MUTED, fontSize: 8, margin: [0, 4, 0, 0] });
  }
  if (table.omittedRows) {
    content.push({ text: `${table.omittedRows} further rows were left out; narrow the period or projects to see them.`, color: MUTED, fontSize: 8, margin: [0, 2, 0, 0] });
  }
  return { stack: content };
}

function section(reportSection: ReportSection, branding: ReportBranding): Content {
  return {
    unbreakable: (reportSection.table?.rows.length ?? 0) <= KEEP_TOGETHER_ROWS,
    stack: [
      { text: reportSection.title, fontSize: 12, bold: true, margin: [0, 6, 0, 2] },
      ...(reportSection.description ? [{ text: reportSection.description, color: MUTED, fontSize: 8, margin: [0, 0, 0, 6] } satisfies Content] : [{ text: '', margin: [0, 0, 0, 4] } satisfies Content]),
      // pdfmake rewrites list items in place, so it gets its own copy.
      ...(reportSection.bullets ? [{ ul: [...reportSection.bullets], fontSize: 9, lineHeight: 1.3 } satisfies Content] : []),
      ...(reportSection.table ? [dataTable(reportSection.table, branding)] : []),
    ],
    margin: [0, 0, 0, 14],
  };
}

export function renderReportPdf(document: ReportDocument, branding: ReportBranding): Promise<Buffer> {
  const widest = Math.max(0, ...document.sections.map((reportSection) => reportSection.table?.columns.length ?? 0));
  const definition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: widest > LANDSCAPE_COLUMNS ? 'landscape' : 'portrait',
    pageMargins: [36, 36, 36, 44],
    info: { title: document.title, author: branding.organizationName, creator: 'SitePilot' },
    defaultStyle: { font: 'Roboto', fontSize: 9, color: '#0F172A' },
    content: [
      header(document, branding),
      metrics(document, branding.currency),
      aiSummary(document, branding),
      ...document.sections.map((reportSection) => section(reportSection, branding)),
    ],
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: `Generated ${generatedAtLabel(document.generatedAt, branding.timezone)} with SitePilot`, color: MUTED, fontSize: 7 },
        { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', color: MUTED, fontSize: 7 },
      ],
      margin: [36, 16, 36, 0],
    }),
  };

  return new Promise((resolve, reject) => {
    const pdf = printer.createPdfKitDocument(definition);
    const chunks: Buffer[] = [];
    pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
    pdf.end();
  });
}
