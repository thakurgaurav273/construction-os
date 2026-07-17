import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { ProcurementController } from './procurement.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { ProcurementRefsService } from './procurement-refs.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ProcurementController],
  providers: [PurchaseOrdersService, ProcurementRefsService],
})
export class ProcurementModule {}
