import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { ObservabilityModule } from '../observability/observability.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DailyProductDigestService } from './daily-product-digest.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationService } from './notification.service';
import { WeeklyProductDigestService } from './weekly-product-digest.service';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [PrismaModule, ObservabilityModule, EmailModule, JobsModule],
  providers: [
    NotificationService,
    NotificationDeliveryService,
    WeeklyProductDigestService,
    DailyProductDigestService,
  ],
  exports: [
    NotificationService,
    NotificationDeliveryService,
    WeeklyProductDigestService,
    DailyProductDigestService,
  ],
})
export class NotificationProcessingModule {}
