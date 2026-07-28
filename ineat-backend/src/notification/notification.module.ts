import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationController } from './notification.controller';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationService } from './notification.service';
import { WeeklyProductDigestService } from './weekly-product-digest.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationDeliveryService,
    NotificationSchedulerService,
    WeeklyProductDigestService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
