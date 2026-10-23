import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export type MaterialStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCKED';
export type MovementType = 'inbound' | 'outbound' | 'transfer' | 'consumption' | 'adjustment';

export interface MaterialListItem {
  id: string;
  name: string;
  sku: string;
  unit: string;
  unitCost: number;
  quantity: number;
  reserved: number;
  incoming: number;
  available: number;
  minStock: number;
  maxStock: number | null;
  stockValue: number;
  status: MaterialStatus;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  supplierId: string | null;
  supplierName: string | null;
  projectCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface MaterialMovement {
  id: string;
  type: MovementType;
  quantity: number;
  reference: string | null;
  note: string | null;
  occurredAt: string;
  material?: { id: string; name: string; unit: string };
  project: { id: string; name: string } | null;
}

export interface MaterialDetail extends MaterialListItem {
  specifications: Record<string, string> | null;
  supplier: {
    id: string;
    name: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    leadTimeDays: number;
    rating: number;
    onTimeRate: number;
  } | null;
  movements: MaterialMovement[];
  projects: {
    projectId: string;
    projectName: string;
    projectCode: string;
    projectStatus: string;
    allocated: number;
    consumed: number;
  }[];
}

export interface MaterialCategory {
  id: string;
  name: string;
  description: string | null;
  materialCount: number;
}

export interface MaterialSupplier {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  leadTimeDays: number;
  rating: number;
  onTimeRate: number;
  openPurchaseOrders: number;
  totalSpend: number;
  materialCount: number;
  suppliedMaterials: string[];
  inventoryValue: number;
}

export interface MaterialsDashboard {
  kpis: {
    totalMaterials: number;
    inventoryValue: number;
    lowStockCount: number;
    reservedValue: number;
    todaysConsumption: number;
    pendingDeliveries: number;
  };
  categorySplit: { name: string; count: number; value: number }[];
  consumptionTrend: { day: string; inbound: number; outbound: number }[];
  supplierSpend: { name: string; spend: number }[];
  lowStock: { id: string; name: string; available: number; minStock: number; unit: string; status: MaterialStatus }[];
  deadStock: { id: string; name: string; quantity: number; unit: string; stockValue: number }[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type MaterialFilters = {
  search?: string;
  categoryId?: string;
  supplierId?: string;
  projectId?: string;
  status?: MaterialStatus;
  lowStock?: boolean;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};

function buildParams(filters: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    params[key] = String(value);
  }
  return params;
}

export function useMaterials(filters: MaterialFilters = {}) {
  return useQuery<Paginated<MaterialListItem>>({
    queryKey: ['materials', filters],
    queryFn: async () => {
      const res = await apiClient.get('/materials', { params: buildParams(filters) });
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useMaterial(id: string) {
  return useQuery<MaterialDetail>({
    queryKey: ['material', id],
    queryFn: async () => {
      const res = await apiClient.get(`/materials/${id}`);
      return res.data.data ?? res.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useMaterialsDashboard() {
  return useQuery<MaterialsDashboard>({
    queryKey: ['materials', 'dashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/materials/dashboard');
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useMaterialCategories() {
  return useQuery<MaterialCategory[]>({
    queryKey: ['materials', 'categories'],
    queryFn: async () => {
      const res = await apiClient.get('/materials/categories');
      return res.data.data ?? res.data;
    },
    staleTime: 60_000,
  });
}

export function useMaterialSuppliers() {
  return useQuery<MaterialSupplier[]>({
    queryKey: ['materials', 'suppliers'],
    queryFn: async () => {
      const res = await apiClient.get('/materials/suppliers');
      return res.data.data ?? res.data;
    },
    staleTime: 60_000,
  });
}

export function useMaterialMovements(filters: {
  materialId?: string;
  projectId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
} = {}) {
  return useQuery<Paginated<MaterialMovement>>({
    queryKey: ['materials', 'movements', filters],
    queryFn: async () => {
      const res = await apiClient.get('/materials/movements', { params: buildParams(filters) });
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useMaterialLowStock() {
  return useQuery<MaterialListItem[]>({
    queryKey: ['materials', 'low-stock'],
    queryFn: async () => {
      const res = await apiClient.get('/materials/low-stock');
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export interface MaterialInput {
  name: string;
  sku: string;
  unit: string;
  unitCost?: number;
  minStock?: number;
  maxStock?: number | null;
  categoryId?: string | null;
  supplierId?: string | null;
}

export type SiteStockMovementType = 'ISSUE' | 'RETURN';

export interface MaterialIssue {
  id: string;
  code: string;
  type: SiteStockMovementType;
  quantity: number;
  unitCost: number;
  value: number;
  note: string | null;
  issuedOn: string;
  material: { id: string; name: string; unit: string };
  warehouse: { id: string; name: string };
  issuedBy: { id: string; name: string };
  /** The subcontractor it is recovered from, if any. */
  subcontract: { id: string; code: string; vendorName: string | null; recoveryRate: number } | null;
}

export interface ProjectMaterialLine {
  materialId: string;
  name: string;
  sku: string;
  unit: string;
  planned: number;
  consumed: number;
  remaining: number;
  consumedValue: number;
  storeAvailable: number;
}

export interface ProjectMaterials {
  summary: {
    materialCount: number;
    consumedValue: number;
    overPlanCount: number;
    issuesThisWeek: number;
  };
  items: ProjectMaterialLine[];
  recentIssues: MaterialIssue[];
}

export interface SiteStockMovementInput {
  materialId: string;
  warehouseId: string;
  quantity: number;
  issuedOn?: string;
  note?: string;
  /** Subcontract the material goes to (or comes back from), to recover it from their bills. */
  contractId?: string;
  recoveryRate?: number;
}

/** Stock changes ripple into material totals, store inventory, the project tab and its timeline. */
function invalidateStock(queryClient: ReturnType<typeof useQueryClient>, projectId?: string): void {
  queryClient.invalidateQueries({ queryKey: ['materials'] });
  queryClient.invalidateQueries({ queryKey: ['material'] });
  queryClient.invalidateQueries({ queryKey: ['inventory'] });
  if (projectId) {
    queryClient.invalidateQueries({ queryKey: ['project-materials', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
  }
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MaterialInput): Promise<MaterialListItem> => {
      const res = await apiClient.post('/materials', input);
      return res.data.data ?? res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<MaterialInput> }): Promise<MaterialListItem> => {
      const res = await apiClient.patch(`/materials/${id}`, input);
      return res.data.data ?? res.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['material', id] });
    },
  });
}

export function useArchiveMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}

export function useProjectMaterials(projectId: string) {
  return useQuery<ProjectMaterials>({
    queryKey: ['project-materials', projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}/materials`);
      return res.data.data ?? res.data;
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useRecordSiteStockMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, type, input }: {
      projectId: string;
      type: SiteStockMovementType;
      input: SiteStockMovementInput;
    }): Promise<MaterialIssue> => {
      const path = type === 'ISSUE' ? 'issues' : 'returns';
      const res = await apiClient.post(`/projects/${projectId}/materials/${path}`, input);
      return res.data.data ?? res.data;
    },
    onSuccess: (_, { projectId }) => invalidateStock(queryClient, projectId),
  });
}

export function useSetMaterialPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, materialId, planned }: { projectId: string; materialId: string; planned: number }) => {
      const res = await apiClient.put(`/projects/${projectId}/materials/${materialId}/plan`, { planned });
      return res.data.data ?? res.data;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project-materials', projectId] });
      queryClient.invalidateQueries({ queryKey: ['material'] });
    },
  });
}
