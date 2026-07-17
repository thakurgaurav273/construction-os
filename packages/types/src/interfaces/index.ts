import type {
  DailyReportStatus,
  MemberRole,
  NotificationType,
  OrgRole,
  ProjectPriority,
  ProjectStatus,
  UserStatus,
} from '../enums';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  address?: string | null;
  gstNumber?: string | null;
  currency: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserOrganization {
  id: string;
  userId: string;
  organizationId: string;
  role: OrgRole;
  joinedAt: Date;
  user?: User;
  organization?: Organization;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  clientName?: string | null;
  location?: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  budget?: number | null;
  spent: number;
  progress: number;
  startDate?: Date | null;
  expectedCompletion?: Date | null;
  actualCompletion?: Date | null;
  organizationId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  members?: ProjectMember[];
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: MemberRole;
  joinedAt: Date;
  user?: User;
}

export interface DailyReport {
  id: string;
  projectId: string;
  organizationId: string;
  submittedById: string;
  date: Date;
  weather?: string | null;
  overallProgress?: number | null;
  workCompleted?: string | null;
  remarks?: string | null;
  labourCount: number;
  status: DailyReportStatus;
  aiSummary?: string | null;
  labourDetails?: LabourDetail[] | null;
  materialsConsumed?: MaterialConsumed[] | null;
  equipmentUsed?: EquipmentUsed[] | null;
  issues?: ReportIssue[] | null;
  createdAt: Date;
  updatedAt: Date;
  submittedBy?: User;
}

export interface LabourDetail {
  trade: string;
  present: number;
  absent: number;
  remarks?: string;
}

export interface MaterialConsumed {
  name: string;
  quantity: number;
  unit: string;
  remarks?: string;
}

export interface EquipmentUsed {
  name: string;
  hours: number;
  remarks?: string;
}

export interface ReportIssue {
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'RESOLVED';
}

export interface Document {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  size: number;
  url: string;
  storageKey: string;
  entityType: string;
  entityId: string;
  projectId?: string | null;
  organizationId: string;
  uploadedById: string;
  createdAt: Date;
  uploadedBy?: User;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  entityType?: string | null;
  entityId?: string | null;
  actorId: string;
  projectId?: string | null;
  organizationId: string;
  createdAt: Date;
  actor?: User;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  entityType?: string | null;
  entityId?: string | null;
  userId: string;
  organizationId: string;
  createdAt: Date;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}
