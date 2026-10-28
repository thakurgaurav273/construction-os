'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, Skeleton, cn } from '@sitepilot/ui';
import {
  Boxes, IndianRupee, AlertTriangle, Lock, Flame, Truck,
} from 'lucide-react';
import { useMaterialsDashboard, type MaterialsDashboard } from '@/hooks/api/use-materials';
import { formatCompactINR } from './materials-format';
import { formatNumber } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  accentClass?: string;
  valueClass?: string;
}

function KpiCard({ title, value, description, icon, accentClass = '', valueClass = '' }: KpiCardProps): React.ReactElement {
  return (
    <Card className={cn('hover:shadow-md transition-all group', accentClass)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground group-hover:text-primary transition-colors">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', valueClass)}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

function KpiSkeletons(): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-[104px] w-full rounded-xl" />
      ))}
    </div>
  );
}

function buildCards(kpis: MaterialsDashboard['kpis']): KpiCardProps[] {
  const lowStock = kpis.lowStockCount;
  const lowStockAccent =
    lowStock > 0
      ? 'border-amber-200 dark:border-amber-800/40'
      : '';
  return [
    {
      title: 'Total Materials',
      value: formatNumber(kpis.totalMaterials),
      description: 'in the catalogue',
      icon: <Boxes className="h-4 w-4" />,
    },
    {
      title: 'Inventory Value',
      value: formatCompactINR(kpis.inventoryValue),
      description: 'stock on hand',
      icon: <IndianRupee className="h-4 w-4" />,
    },
    {
      title: 'Low Stock',
      value: formatNumber(lowStock),
      description: 'below reorder point',
      icon: <AlertTriangle className="h-4 w-4" />,
      accentClass: lowStockAccent,
      valueClass: lowStock > 0 ? 'text-amber-600 dark:text-amber-400' : '',
    },
    {
      title: 'Reserved Stock',
      value: formatCompactINR(kpis.reservedValue),
      description: 'allocated to projects',
      icon: <Lock className="h-4 w-4" />,
    },
    {
      title: "Today's Consumption",
      value: formatCompactINR(kpis.todaysConsumption),
      description: 'issued to site today',
      icon: <Flame className="h-4 w-4" />,
    },
    {
      title: 'Pending Deliveries',
      value: formatNumber(kpis.pendingDeliveries),
      description: 'incoming shipments',
      icon: <Truck className="h-4 w-4" />,
    },
  ];
}

export function MaterialsKpis(): React.ReactElement {
  const { data, isLoading, isError } = useMaterialsDashboard();

  if (isLoading) return <KpiSkeletons />;

  if (isError || !data) {
    return (
      <Card className="border-red-200 dark:border-red-800/40">
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          Unable to load inventory metrics right now.
        </CardContent>
      </Card>
    );
  }

  const cards = buildCards(data.kpis);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    >
      {cards.map((card) => (
        <motion.div key={card.title} variants={itemVariants}>
          <KpiCard {...card} />
        </motion.div>
      ))}
    </motion.div>
  );
}
