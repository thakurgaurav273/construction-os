'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, Avatar, AvatarFallback, Badge } from '@sitepilot/ui';
import { Star, ChevronRight } from 'lucide-react';
import { formatCompactINR } from './procurement-format';
import { format } from 'date-fns';
import type { Vendor } from '@/data/procurement-demo';

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-orange-500',
];

export function getVendorAvatarColor(vendorId: string): string {
  const digits = vendorId.replace(/\D/g, '');
  const idx = digits ? parseInt(digits, 10) : vendorId.charCodeAt(0);
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

export function getVendorInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function scoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

interface MetricProps {
  label: string;
  value: string | number;
  valueClass?: string;
}

function Metric({ label, value, valueClass = '' }: MetricProps): React.ReactElement {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

interface VendorCardProps {
  vendor: Vendor;
  onClick: () => void;
}

export function VendorCard({ vendor, onClick }: VendorCardProps): React.ReactElement {
  const color = getVendorAvatarColor(vendor.id);

  return (
    <Card
      onClick={onClick}
      className="hover:shadow-md transition-all cursor-pointer group"
    >
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Avatar className={`h-11 w-11 shrink-0 ${color} text-white`}>
            <AvatarFallback className={`${color} text-white text-sm font-bold`}>
              {getVendorInitials(vendor.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight group-hover:text-primary transition-colors truncate">
              {vendor.name}
            </p>
            <p className="text-xs text-muted-foreground">{vendor.code}</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 shrink-0">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              {vendor.rating.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {vendor.categories.map((category) => (
            <Badge key={category} variant="secondary" className="text-xs">
              {category}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Metric
            label="Performance"
            value={vendor.performanceScore}
            valueClass={scoreColor(vendor.performanceScore)}
          />
          <Metric label="On-Time" value={`${vendor.onTimeDeliveryPercent}%`} />
          <Metric label="Projects" value={vendor.projectCount} />
          <Metric label="Outstanding" value={formatCompactINR(vendor.outstandingBalance)} />
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-xs text-muted-foreground">
            Last order {format(new Date(vendor.lastOrderDate), 'dd MMM yyyy')}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}
