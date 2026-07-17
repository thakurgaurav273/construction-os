import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';

import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { WorkforceModule } from './modules/workforce/workforce.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { InventoryModule } from './modules/inventory/inventory.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    AuthModule,
    ProjectsModule,
    DashboardModule,
    WorkforceModule,
    MaterialsModule,
    InventoryModule,
  ],
})
export class AppModule {}
