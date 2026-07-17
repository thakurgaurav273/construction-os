export interface PurchaseOrderItemDto {
  description: string;
  quantity: number;
  rate: number;
  tax: number;
  total: number;
}

export interface PurchaseOrderDto {
  id: string;
  number: string;
  vendor: string;
  project: string;
  amount: number;
  status: 'pending' | 'approved' | 'delivered';
  createdDate: string;
  expectedDelivery: string;
  createdBy: string;
  items: PurchaseOrderItemDto[];
}
