import { Global, Module } from '@nestjs/common';
import { JobsService } from './jobs.service';

/** Background jobs for every module: BullMQ on Redis when configured, in-process otherwise. */
@Global()
@Module({
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
