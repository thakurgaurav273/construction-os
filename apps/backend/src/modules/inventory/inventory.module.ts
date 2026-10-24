import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { InventoryController } from './inventory.controller';
import { InventoryAdjustmentsService } from './inventory-adjustments.service';
import { InventoryDashboardService } from './inventory-dashboard.service';
import { InventoryItemsService } from './inventory-items.service';
import { InventoryTransactionsService } from './inventory-transactions.service';
import { InventoryTransfersService } from './inventory-transfers.service';
import { InventoryWarehousesService } from './inventory-warehouses.service';
import { InventoryReorderService } from './inventory-reorder.service';
import { StockLedgerService } from './stock-ledger.service';
import { InventoryTransferWorkflowService } from './inventory-transfer-workflow.service';
import { WarehouseSetupService } from './warehouse-setup.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [InventoryController],
  providers: [
    InventoryItemsService,
    InventoryWarehousesService,
    InventoryTransfersService,
    InventoryTransactionsService,
    InventoryAdjustmentsService,
    InventoryDashboardService,
    StockLedgerService,
    InventoryReorderService,
    InventoryTransferWorkflowService,
    WarehouseSetupService,
  ],
  exports: [StockLedgerService, InventoryAdjustmentsService],
})
export class InventoryModule {}
