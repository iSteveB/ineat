import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ObservabilityModule } from '../observability/observability.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JobsModule } from '../jobs/jobs.module';
import { AdminAuditService } from './admin-audit.service';

@Module({
  imports: [AuthModule, ObservabilityModule, PrismaModule, JobsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminAuditService],
})
export class AdminModule {}
