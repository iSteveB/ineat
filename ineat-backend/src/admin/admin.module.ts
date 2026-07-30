import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ObservabilityModule } from '../observability/observability.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JobsModule } from '../jobs/jobs.module';
import { AdminAuditService } from './admin-audit.service';
import { BillingModule } from '../billing/billing.module';
import { AdminBillingService } from './admin-billing.service';

@Module({
  imports: [
    AuthModule,
    ObservabilityModule,
    PrismaModule,
    JobsModule,
    BillingModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminAuditService, AdminBillingService],
})
export class AdminModule {}
