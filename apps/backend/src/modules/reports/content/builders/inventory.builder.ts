import { InventoryTransactionType, Prisma } from '@prisma/client';
import { roundMoney, toNumber } from '../../../procurement/procurement-math';
import { ReportBuilder, ReportScope, col, inPeriod, projectIds, table } from '../report-document';

const MOVEMENT_LABELS: Record<InventoryTransactionType, string> = {
  RECEIVE: 'Received', ISSUE: 'Issued', ADJUSTMENT: 'Adjusted', TRANSFER_IN: 'Transferred in', TRANSFER_OUT: 'Transferred out',
  CONSUMPTION: 'Consumed', RETURN: 'Returned', DAMAGE: 'Damaged',
};

const roundQuantity = (value: number): number => Math.round(value * 1000) / 1000;

/** Chosen projects narrow stock to their site stores; with no projects chosen every warehouse counts. */
function warehouseFilter(scope: ReportScope): Prisma.WarehouseWhereInput {
  return {
    organizationId: scope.organizationId,
    deletedAt: null,
    ...(scope.allProjects ? {} : { projectId: { in: projectIds(scope) } }),
  };
}

/** Stock on hand and its value, what needs reordering, and stock movements in the period. */
export const buildInventoryReport: ReportBuilder = async (scope) => {
  const warehouse = warehouseFilter(scope);
  const [items, movements] = await Promise.all([
    scope.prisma.inventoryItem.findMany({
      where: { organizationId: scope.organizationId, warehouse },
      select: {
        quantity: true, reserved: true, damaged: true, reorderLevel: true,
        material: { select: { name: true, sku: true, unit: true, unitCost: true } },
        warehouse: { select: { name: true } },
      },
      orderBy: [{ warehouse: { name: 'asc' } }, { material: { name: 'asc' } }],
    }),
    scope.prisma.inventoryTransaction.findMany({
      where: { organizationId: scope.organizationId, warehouse, occurredAt: inPeriod(scope) },
      select: { type: true, quantity: true, unitCost: true },
    }),
  ]);

  const stock = items.map((item) => {
    const quantity = toNumber(item.quantity);
    const available = quantity - toNumber(item.reserved) - toNumber(item.damaged);
    const reorderLevel = toNumber(item.reorderLevel);
    return {
      material: item.material.name,
      sku: item.material.sku,
      warehouse: item.warehouse.name,
      unit: item.material.unit,
      quantity: roundQuantity(quantity),
      available: roundQuantity(available),
      reorderLevel: roundQuantity(reorderLevel),
      value: roundMoney(quantity * toNumber(item.material.unitCost)),
    };
  });
  const lowStock = stock.filter((row) => row.reorderLevel > 0 && row.available <= row.reorderLevel);
  const stockValue = roundMoney(stock.reduce((sum, row) => sum + row.value, 0));
  const types = Object.keys(MOVEMENT_LABELS) as InventoryTransactionType[];
  const STOCK_COLUMNS = [
    col('material', 'Material'), col('sku', 'SKU'), col('warehouse', 'Warehouse'), col('unit', 'Unit'),
    col('quantity', 'On hand', 'number'), col('available', 'Available', 'number'), col('reorderLevel', 'Reorder at', 'number'),
  ];

  return {
    subtitle: 'Stock on hand, reorder needs and movements by warehouse.',
    metrics: [
      { label: 'Stock value', value: stockValue, kind: 'money', hint: 'On-hand quantity at material cost' },
      { label: 'Stock lines', value: stock.length, kind: 'number' },
      { label: 'Below reorder level', value: lowStock.length, kind: 'number', tone: lowStock.length > 0 ? 'bad' : 'good' },
      { label: 'Movements', value: movements.length, kind: 'number' },
    ],
    sections: [
      {
        title: 'Needs reordering',
        table: table(STOCK_COLUMNS, lowStock, 'Nothing is below its reorder level.'),
      },
      {
        title: 'Movements in the period',
        table: table(
          [col('type', 'Movement'), col('count', 'Entries', 'number'), col('value', 'Value', 'money')],
          types
            .map((type) => {
              const ofType = movements.filter((movement) => movement.type === type);
              return {
                type: MOVEMENT_LABELS[type],
                count: ofType.length,
                value: roundMoney(ofType.reduce((sum, movement) => sum + Math.abs(toNumber(movement.quantity)) * toNumber(movement.unitCost), 0)),
              };
            })
            .filter((row) => row.count > 0),
          'No stock moved in this period.',
        ),
      },
      {
        title: 'Stock on hand',
        table: table(
          [...STOCK_COLUMNS, col('value', 'Value', 'money')],
          stock,
          'No stock is held in these warehouses.',
          { material: 'Total', value: stockValue },
        ),
      },
    ],
  };
};
