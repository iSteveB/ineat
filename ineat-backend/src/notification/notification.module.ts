import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationProcessingModule } from './notification-processing.module';

@Module({
  imports: [NotificationProcessingModule],
  controllers: [NotificationController],
  providers: [NotificationSchedulerService],
  exports: [NotificationProcessingModule],
})
export class NotificationModule {}
