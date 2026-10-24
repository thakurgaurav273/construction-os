import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { InventoryModule } from '../inventory/inventory.module';
import { MaterialsModule } from '../materials/materials.module';
import { ProcurementModule } from '../procurement/procurement.module';
import { ColumnMappingService } from './column-mapping.service';
import { DataImportController } from './data-import.controller';
import { DataImportService } from './data-import.service';
import { ImportTemplatesService } from './import-templates.service';
import { MaterialImporter } from './importers/material.importer';
import { OpeningStockImporter } from './importers/opening-stock.importer';
import { PurchaseOrderImporter } from './importers/purchase-order.importer';
import { VendorImporter } from './importers/vendor.importer';

/** Spreadsheet import and export in each organization's own layout. */
@Module({
  imports: [DatabaseModule, AuthModule, AiModule, MaterialsModule, ProcurementModule, InventoryModule],
  controllers: [DataImportController],
  providers: [
    DataImportService,
    ImportTemplatesService,
    ColumnMappingService,
    MaterialImporter,
    VendorImporter,
    OpeningStockImporter,
    PurchaseOrderImporter,
  ],
})
export class DataImportModule {}
