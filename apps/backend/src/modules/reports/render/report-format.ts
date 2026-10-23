import type { CellValue, ValueKind } from '../content/report-document';

export interface ReportBranding {
  organizationName: string;
  currency: string;
  /** IANA zone the "generated at" time is shown in. */
  timezone: string;
  /** #RRGGBB; falls back to the SitePilot primary colour. */
  brandColor: string;
  /** PNG or JPEG bytes; other formats are left out of documents. */
  logo: Buffer | null;
}

export const DEFAULT_BRAND_COLOR = '#2563EB';

const SHORT_DATE = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function formatDate(isoDate: string): string {
  return SHORT_DATE.format(new Date(isoDate));
}

function currencyFormatter(currency: string): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 });
  } catch {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  }
}

/** Display text for one value, shared by the PDF and email so they read the same. */
export function formatValue(value: CellValue, kind: ValueKind, currency: string): string {
  if (value === null || value === '') return '—';
  if (typeof value === 'string') return kind === 'date' ? formatDate(value) : value;
  switch (kind) {
    case 'money': return currencyFormatter(currency).format(value);
    case 'percent': return `${value}%`;
    case 'number': return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value);
    default: return String(value);
  }
}

export function generatedAtLabel(isoDate: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone, timeZoneName: 'short',
    }).format(new Date(isoDate));
  } catch {
    return new Date(isoDate).toUTCString();
  }
}

export function periodLabel(period: { from: string; to: string }): string {
  return `${formatDate(period.from)} – ${formatDate(period.to)}`;
}

export function projectsLabel(projectNames: string[], allProjects: boolean): string {
  if (allProjects) return 'All projects';
  if (projectNames.length <= 3) return projectNames.join(', ');
  return `${projectNames.slice(0, 3).join(', ')} and ${projectNames.length - 3} more`;
}

/** A pale tint of the brand colour for table headers, mixed with white. */
export function tint(hex: string, amount: number): string {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return `#${channels.map((channel) => Math.round(channel + (255 - channel) * amount).toString(16).padStart(2, '0')).join('')}`;
}
