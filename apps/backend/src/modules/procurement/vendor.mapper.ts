import { Vendor, VendorStatus } from '@prisma/client';
import { toNumber } from './procurement-math';

/** Derived from approved purchase orders and received deliveries, never stored. */
export interface VendorStats {
  totalOrders: number;
  projectCount: number;
  totalSpend: number;
  lastOrderDate: Date | null;
  /** Share of received deliveries that arrived on or before the scheduled day; null until one arrives. */
  onTimeDeliveryPercent: number | null;
  deliveriesReceived: number;
}

export const EMPTY_VENDOR_STATS: VendorStats = {
  totalOrders: 0,
  projectCount: 0,
  totalSpend: 0,
  lastOrderDate: null,
  onTimeDeliveryPercent: null,
  deliveriesReceived: 0,
};

export interface VendorView {
  id: string;
  name: string;
  code: string;
  categories: string[];
  status: VendorStatus;
  rating: number;
  performanceScore: number;
  deliveryAccuracy: number;
  qualityRating: number;
  responseTimeHours: number;
  outstandingBalance: number;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  gstNumber: string | null;
  paymentTerms: string | null;
  city: string | null;
  state: string | null;
  aiRecommendation: string | null;
  createdAt: Date;
  stats: VendorStats;
}

export function toVendorView(vendor: Vendor, stats: VendorStats): VendorView {
  return {
    id: vendor.id,
    name: vendor.name,
    code: vendor.code,
    categories: vendor.categories,
    status: vendor.status,
    rating: vendor.rating,
    performanceScore: vendor.performanceScore,
    deliveryAccuracy: vendor.deliveryAccuracy,
    qualityRating: vendor.qualityRating,
    responseTimeHours: vendor.responseTimeHours,
    outstandingBalance: toNumber(vendor.outstandingBalance),
    contactPerson: vendor.contactPerson,
    phone: vendor.phone,
    email: vendor.email,
    gstNumber: vendor.gstNumber,
    paymentTerms: vendor.paymentTerms,
    city: vendor.city,
    state: vendor.state,
    aiRecommendation: vendor.aiRecommendation,
    createdAt: vendor.createdAt,
    stats,
  };
}
