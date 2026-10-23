import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { FinanceModule } from '../finance/finance.module';
import { ProcurementModule } from '../procurement/procurement.module';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { ContractItemsService } from './contract-items.service';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { RaBillHistoryService } from './ra-bill-history.service';
import { RaBillTotalsService } from './ra-bill-totals.service';
import { RaBillWorkflowService } from './ra-bill-workflow.service';
import { RaBillsController } from './ra-bills.controller';
import { RaBillsService } from './ra-bills.service';
import { RaBillReceiptsService } from './ra-bill-receipts.service';
import { RaBillSettlementService } from './ra-bill-settlement.service';
import { ReceivablesController } from './receivables.controller';
import { ReceivablesService } from './receivables.service';
import { RetentionService } from './retention.service';

/** Contracts with a BOQ, billed in running account bills, in either direction (to clients or from subcontractors). */
@Module({
  imports: [DatabaseModule, AuthModule, ProcurementModule, FinanceModule],
  controllers: [ClientsController, ContractsController, RaBillsController, ReceivablesController],
  providers: [
    ClientsService,
    ContractsService,
    ContractItemsService,
    RaBillTotalsService,
    RaBillHistoryService,
    RaBillsService,
    RaBillWorkflowService,
    RaBillSettlementService,
    RaBillReceiptsService,
    ReceivablesService,
    RetentionService,
  ],
})
export class BillingModule {}
