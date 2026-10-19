import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { ProcurementAnalyticsService } from './procurement-analytics.service';
import { ProcurementInsightsController } from './procurement-insights.controller';
import { ProcurementSummaryService } from './procurement-summary.service';
import { PurchaseOrderHistoryService } from './purchase-order-history.service';
import { PurchaseOrderWorkflowService } from './purchase-order-workflow.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { RfqQuotesService } from './rfq-quotes.service';
import { RfqsController } from './rfqs.controller';
import { RfqsService } from './rfqs.service';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
    PurchaseOrdersController,
    DeliveriesController,
    VendorsController,
    RfqsController,
    ProcurementInsightsController,
  ],
  providers: [
    PurchaseOrderHistoryService,
    PurchaseOrdersService,
    PurchaseOrderWorkflowService,
    DeliveriesService,
    VendorsService,
    RfqsService,
    RfqQuotesService,
    ProcurementSummaryService,
    ProcurementAnalyticsService,
  ],
})
export class ProcurementModule {}
