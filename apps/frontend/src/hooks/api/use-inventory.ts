import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCKED';

export type InventoryTransactionType =
  | 'RECEIVE'
  | 'ISSUE'
  | 'ADJUSTMENT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'CONSUMPTION'
  | 'RETURN'
  | 'DAMAGE';

export type TransferStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export type TransferAction = 'approve' | 'reject' | 'complete' | 'cancel';

export type AdjustmentReason = 'CYCLE_COUNT' | 'DAMAGE' | 'LOSS' | 'FOUND' | 'CORRECTION' | 'RETURN';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InventoryItemListItem {
  id: string;
  materialId: string;
  materialName: string;
  sku: string;
  unit: string;
  unitCost: number;
  categoryId: string | null;
  categoryName: string | null;
  supplierId: string | null;
  supplierName: string | null;
  warehouseId: string;
  warehouseName: string;
  warehouseType: string;
  projectId: string | null;
  projectName: string | null;
  quantity: number;
  reserved: number;
  damaged: number;
  incoming: number;
  available: number;
  reorderLevel: number;
  value: number;
  status: InventoryStatus;
  updatedAt: string;
}

export interface InventoryItemTransaction {
  id: string;
  type: InventoryTransactionType;
  quantity: number;
  reference: string | null;
  note: string | null;
  project: { id: string; name: string } | null;
  occurredAt: string;
}

export interface InventoryItemReservation {
  id: string;
  quantity: number;
  status: string;
  note: string | null;
  project: { id: string; name: string } | null;
  createdAt: string;
}

export interface InventoryItemDetail {
  id: string;
  materialId: string;
  materialName: string;
  sku: string;
  unit: string;
  unitCost: number;
  quantity: number;
  reserved: number;
  damaged: number;
  incoming: number;
  available: number;
  reorderLevel: number;
  value: number;
  status: InventoryStatus;
  warehouse: { id: string; name: string; type: string; city: string | null; projectId: string | null };
  location: { id: string; name: string; code: string; zone: string | null } | null;
  category: { id: string; name: string } | null;
  supplier: {
    id: string;
    name: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    leadTimeDays: number;
    rating: number;
    onTimeRate: number;
    openPurchaseOrders: number;
  } | null;
  transactions: InventoryItemTransaction[];
  reservations: InventoryItemReservation[];
  purchaseOrders: { reference: string; quantity: number; unitCost: number; occurredAt: string }[];
  consumption: { projectId: string; projectName: string; quantity: number }[];
  updatedAt: string;
}

export interface InventoryDashboard {
  kpis: {
    inventoryValue: number;
    availableStock: number;
    reservedValue: number;
    lowStockItems: number;
    pendingTransfers: number;
    stockAccuracy: number;
  };
  valueByWarehouse: { name: string; value: number }[];
  warehouseUtilization: { name: string; utilization: number }[];
  categorySplit: { name: string; value: number; count: number }[];
  movementTrend: { day: string; inbound: number; outbound: number }[];
  lowStock: {
    id: string;
    materialName: string;
    warehouseName: string;
    available: number;
    reorderLevel: number;
    unit: string;
    status: InventoryStatus;
  }[];
}

export interface InventoryAnalytics {
  valueByWarehouse: { name: string; value: number }[];
  warehouseUtilization: { name: string; utilization: number }[];
  stockAging: { bucket: string; value: number }[];
  fastMoving: { name: string; unit: string; movement: number }[];
  slowMoving: { name: string; unit: string; movement: number }[];
  deadStock: { name: string; unit: string; quantity: number; value: number; warehouse: string }[];
  monthlyConsumption: { month: string; consumption: number }[];
  transferVolume: { month: string; quantity: number }[];
}

export interface WarehouseCard {
  id: string;
  name: string;
  code: string;
  type: string;
  city: string | null;
  manager: string | null;
  projectId: string | null;
  projectName: string | null;
  capacity: number | null;
  itemCount: number;
  locationCount: number;
  totalQuantity: number;
  inventoryValue: number;
  reservedValue: number;
  lowStockCount: number;
  utilization: number | null;
  recentActivity: number;
}

export interface WarehouseItem {
  id: string;
  materialId: string;
  materialName: string;
  sku: string;
  unit: string;
  quantity: number;
  reserved: number;
  damaged: number;
  available: number;
  reorderLevel: number;
  value: number;
  status: InventoryStatus;
}

export interface WarehouseTransaction {
  id: string;
  type: InventoryTransactionType;
  materialName: string;
  unit: string;
  quantity: number;
  reference: string | null;
  occurredAt: string;
}

export interface WarehouseDetail {
  id: string;
  name: string;
  code: string;
  type: string;
  address: string | null;
  city: string | null;
  manager: string | null;
  capacity: number | null;
  projectId: string | null;
  projectName: string | null;
  locations: { id: string; name: string; code: string; zone: string | null }[];
  items: WarehouseItem[];
  inbound: WarehouseTransaction[];
  outbound: WarehouseTransaction[];
  kpis: {
    itemCount: number;
    totalQuantity: number;
    inventoryValue: number;
    reservedValue: number;
    lowStockCount: number;
    utilization: number | null;
  };
}

export interface TransferListItem {
  id: string;
  code: string;
  status: TransferStatus;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  itemCount: number;
  totalQuantity: number;
  note: string | null;
  requestedBy: string | null;
  approvedBy: string | null;
  createdAt: string;
  approvedAt: string | null;
  completedAt: string | null;
}

export interface TransferDetail {
  id: string;
  code: string;
  status: TransferStatus;
  fromWarehouse: { id: string; name: string; type: string; city: string | null };
  toWarehouse: { id: string; name: string; type: string; city: string | null };
  note: string | null;
  requestedBy: string | null;
  approvedBy: string | null;
  createdAt: string;
  approvedAt: string | null;
  completedAt: string | null;
  items: { id: string; materialId: string; materialName: string; sku: string; unit: string; quantity: number }[];
  transactions: { id: string; type: InventoryTransactionType; warehouseName: string; quantity: number; occurredAt: string }[];
  timeline: { stage: string; date: string | null; done: boolean }[];
}

export interface InventoryTransactionListItem {
  id: string;
  type: InventoryTransactionType;
  quantity: number;
  unitCost: number;
  value: number;
  reference: string | null;
  note: string | null;
  materialId: string;
  materialName: string;
  unit: string;
  warehouseId: string;
  warehouseName: string;
  projectId: string | null;
  projectName: string | null;
  occurredAt: string;
}

export interface StockAdjustment {
  id: string;
  code: string;
  reason: AdjustmentReason;
  quantityBefore: number;
  quantityAfter: number;
  delta: number;
  note: string | null;
  materialName: string;
  unit: string;
  warehouseName: string;
  createdAt: string;
}

export type InventoryItemFilters = {
  search?: string;
  warehouseId?: string;
  projectId?: string;
  materialId?: string;
  categoryId?: string;
  status?: InventoryStatus;
  lowStock?: boolean;
  reserved?: boolean;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};

export type TransferFilters = {
  warehouseId?: string;
  status?: TransferStatus;
  search?: string;
  page?: number;
  limit?: number;
};

export type TransactionFilters = {
  warehouseId?: string;
  materialId?: string;
  projectId?: string;
  type?: InventoryTransactionType;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};

export interface CreateTransferInput {
  fromWarehouseId: string;
  toWarehouseId: string;
  note?: string;
  requestedBy?: string;
  items: { materialId: string; quantity: number }[];
}

export interface CreateAdjustmentInput {
  warehouseId: string;
  materialId: string;
  reason: AdjustmentReason;
  quantityAfter: number;
  note?: string;
  adjustedBy?: string;
}

function buildParams(filters: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    params[key] = String(value);
  }
  return params;
}

export function useInventoryDashboard() {
  return useQuery<InventoryDashboard>({
    queryKey: ['inventory', 'dashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/dashboard');
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useInventoryAnalytics() {
  return useQuery<InventoryAnalytics>({
    queryKey: ['inventory', 'analytics'],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/analytics');
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useInventoryItems(filters: InventoryItemFilters = {}) {
  return useQuery<Paginated<InventoryItemListItem>>({
    queryKey: ['inventory', 'items', filters],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/items', { params: buildParams(filters) });
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useInventoryItem(id: string) {
  return useQuery<InventoryItemDetail>({
    queryKey: ['inventory', 'item', id],
    queryFn: async () => {
      const res = await apiClient.get(`/inventory/items/${id}`);
      return res.data.data ?? res.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useWarehouses() {
  return useQuery<WarehouseCard[]>({
    queryKey: ['inventory', 'warehouses'],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/warehouses');
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useWarehouse(id: string) {
  return useQuery<WarehouseDetail>({
    queryKey: ['inventory', 'warehouse', id],
    queryFn: async () => {
      const res = await apiClient.get(`/inventory/warehouses/${id}`);
      return res.data.data ?? res.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useTransfers(filters: TransferFilters = {}) {
  return useQuery<Paginated<TransferListItem>>({
    queryKey: ['inventory', 'transfers', filters],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/transfers', { params: buildParams(filters) });
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useTransfer(id: string) {
  return useQuery<TransferDetail>({
    queryKey: ['inventory', 'transfer', id],
    queryFn: async () => {
      const res = await apiClient.get(`/inventory/transfers/${id}`);
      return res.data.data ?? res.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery<Paginated<InventoryTransactionListItem>>({
    queryKey: ['inventory', 'transactions', filters],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/transactions', { params: buildParams(filters) });
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useAdjustments(warehouseId?: string) {
  return useQuery<StockAdjustment[]>({
    queryKey: ['inventory', 'adjustments', warehouseId ?? 'all'],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/adjustments', {
        params: buildParams({ warehouseId }),
      });
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { reorderLevel?: number; damaged?: number; incoming?: number; locationId?: string };
    }) => {
      const res = await apiClient.patch(`/inventory/items/${id}`, data);
      return res.data.data ?? res.data;
    },
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory', 'item', variables.id] });
    },
  });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTransferInput) => {
      const res = await apiClient.post('/inventory/transfers', data);
      return res.data.data ?? res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useUpdateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
      actor,
      note,
    }: {
      id: string;
      action: TransferAction;
      actor?: string;
      note?: string;
    }) => {
      const res = await apiClient.patch(`/inventory/transfers/${id}`, { action, actor, note });
      return res.data.data ?? res.data;
    },
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory', 'transfer', variables.id] });
    },
  });
}

export function useCreateAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAdjustmentInput) => {
      const res = await apiClient.post('/inventory/adjustments', data);
      return res.data.data ?? res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
