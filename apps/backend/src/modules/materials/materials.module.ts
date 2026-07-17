import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [MaterialsController],
  providers: [MaterialsService],
})
export class MaterialsModule {}
