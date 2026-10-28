/** Must match OrgRole on the backend. */
export const ORG_ROLES = ['OWNER', 'ADMIN', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'STORE_MANAGER', 'PROCUREMENT', 'FINANCE', 'VIEWER'] as const;

export type OrgRole = (typeof ORG_ROLES)[number];

/** One line per role, shown next to its permissions so admins can pick the right one when inviting. */
export const ROLE_SUMMARIES: Record<OrgRole, string> = {
  OWNER: 'Full access, including granting the Owner role and removing other owners.',
  ADMIN: 'Full access to every module and setting, except managing owners.',
  PROJECT_MANAGER: 'Runs projects: approves daily reports and purchase orders, manages materials and sites.',
  SITE_ENGINEER: 'Works on site: daily reports, attendance, the crew directory, deliveries and purchase requests.',
  STORE_MANAGER: 'Looks after stores: stock, issues, transfers and adjustments.',
  PROCUREMENT: 'Buys for projects: vendors, RFQs and purchase orders.',
  FINANCE: 'Handles money: vendor bills, payments and financial reports.',
  VIEWER: 'Can look around but not change anything.',
};

export function formatRole(role: string): string {
  return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
