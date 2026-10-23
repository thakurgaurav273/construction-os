import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectMembersService } from './project-members.service';
import { ProjectLifecycleService } from './project-lifecycle.service';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectMembersService, ProjectLifecycleService],
})
export class ProjectsModule {}
