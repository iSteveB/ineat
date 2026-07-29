import { Global, Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { QueueService } from './queue.service';
import { QueueMonitoringService } from './queue-monitoring.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ObservabilityModule } from '../observability/observability.module';

@Global()
@Module({
  imports: [RedisModule, PrismaModule, ObservabilityModule],
  providers: [QueueService, QueueMonitoringService],
  exports: [QueueService, QueueMonitoringService],
})
export class JobsModule {}
