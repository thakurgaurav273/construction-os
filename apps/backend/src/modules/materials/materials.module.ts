import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { InventoryModule } from '../inventory/inventory.module';
import { MaterialsController } from './materials.controller';
import { MaterialsDashboardService } from './materials-dashboard.service';
import { MaterialsService } from './materials.service';
import { ProjectMaterialsController } from './project-materials.controller';
import { ProjectMaterialsService } from './project-materials.service';

@Module({
  imports: [DatabaseModule, AuthModule, InventoryModule],
  controllers: [MaterialsController, ProjectMaterialsController],
  providers: [MaterialsService, MaterialsDashboardService, ProjectMaterialsService],
})
export class MaterialsModule {}
