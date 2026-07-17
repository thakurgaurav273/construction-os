export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

export enum ProjectPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum OrgRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  SITE_ENGINEER = 'SITE_ENGINEER',
  STORE_MANAGER = 'STORE_MANAGER',
  PROCUREMENT = 'PROCUREMENT',
  FINANCE = 'FINANCE',
  VIEWER = 'VIEWER',
}

export enum MemberRole {
  MANAGER = 'MANAGER',
  ENGINEER = 'ENGINEER',
  VIEWER = 'VIEWER',
}

export enum DailyReportStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
}

export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export enum ActivityEntityType {
  PROJECT = 'PROJECT',
  DAILY_REPORT = 'DAILY_REPORT',
  DOCUMENT = 'DOCUMENT',
  MEMBER = 'MEMBER',
}
