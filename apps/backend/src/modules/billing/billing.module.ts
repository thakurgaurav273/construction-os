import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
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

/** Contracts with a BOQ, billed in running account bills, in either direction (to clients or from subcontractors). */
@Module({
  imports: [DatabaseModule, AuthModule, ProcurementModule],
  controllers: [ClientsController, ContractsController, RaBillsController],
  providers: [
    ClientsService,
    ContractsService,
    ContractItemsService,
    RaBillTotalsService,
    RaBillHistoryService,
    RaBillsService,
    RaBillWorkflowService,
  ],
})
export class BillingModule {}
