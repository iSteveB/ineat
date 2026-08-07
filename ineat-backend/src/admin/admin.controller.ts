import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequiresRole } from '../auth/decorators/requires-role.decorator';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { AdminService } from './admin.service';
import {
  AdminAccountActionDto,
  RetryQueueJobDto,
  UpdateRoleDto,
} from './dto/admin-mutation.dto';
import {
  AdminAuditService,
  type AdminActorContext,
} from './admin-audit.service';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { AdminDashboardQueryDto } from './dto/admin-dashboard-query.dto';
import { AdminBillingService } from './admin-billing.service';
import {
  AdminReasonDto,
  CreatePromotionCodeDto,
} from './dto/admin-billing.dto';
import { AdminAuditQueryDto } from './dto/admin-audit-query.dto';
import {
  AdminIncidentsQueryDto,
  AdminQueueJobsQueryDto,
} from './dto/admin-operations-query.dto';
import { AdminOperationsService } from './admin-operations.service';
import { ParseUserIdPipe } from './pipes/parse-user-id.pipe';

type AdminRequest = Request & {
  user: {
    id: string;
    authSessionId?: string;
  };
};

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@RequiresRole('ADMIN')
@UseGuards(SessionAuthGuard, RoleGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminBillingService: AdminBillingService,
    private readonly adminAuditService: AdminAuditService,
    private readonly adminOperationsService: AdminOperationsService,
  ) {}

  @Get('dashboard')
  getDashboard(@Query() query: AdminDashboardQueryDto) {
    return this.adminService.getDashboard(query);
  }

  @Get('observability')
  getObservability() {
    return this.adminService.getObservability();
  }

  @Get('audit-logs')
  listAuditLogs(@Query() query: AdminAuditQueryDto) {
    return this.adminAuditService.list(query);
  }

  @Get('queues')
  getQueues() {
    return this.adminService.getQueues();
  }

  @Get('queues/:queueName/jobs')
  async listQueueJobs(
    @Param('queueName') queueName: string,
    @Query() query: AdminQueueJobsQueryDto,
  ) {
    return {
      success: true,
      data: await this.adminService.listQueueJobs(queueName, query),
    };
  }

  @Get('incidents')
  listIncidents(@Query() query: AdminIncidentsQueryDto) {
    return this.adminOperationsService.listIncidents(query);
  }

  @Post('queues/:queueName/jobs/:jobId/retry')
  retryQueueJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
    @Body() body: RetryQueueJobDto,
    @Req() request: AdminRequest,
  ) {
    return this.adminService.retryQueueJob(
      queueName,
      jobId,
      body.reason,
      this.actorContext(request),
    );
  }

  @Get('users')
  listUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  getUser(@Param('id', ParseUserIdPipe) id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/role')
  updateRole(
    @Param('id', ParseUserIdPipe) id: string,
    @Body() body: UpdateRoleDto,
    @Req() request: AdminRequest,
  ) {
    return this.adminService.updateUserRole(
      id,
      body.role,
      body.reason,
      this.actorContext(request),
    );
  }

  @Post('users/:id/account/:action')
  updateAccountStatus(
    @Param('id', ParseUserIdPipe) id: string,
    @Param('action') action: string,
    @Body() body: AdminAccountActionDto,
    @Req() request: AdminRequest,
  ) {
    return this.adminService.updateAccountStatus(
      id,
      action,
      body,
      this.actorContext(request),
    );
  }

  @Get('promotions')
  listPromotionCodes() {
    return this.adminBillingService.listPromotionCodes();
  }

  @Post('promotions')
  createPromotionCode(
    @Body() body: CreatePromotionCodeDto,
    @Req() request: AdminRequest,
  ) {
    return this.adminBillingService.createPromotionCode(
      body,
      this.actorContext(request),
    );
  }

  @Post('promotions/:id/deactivate')
  deactivatePromotionCode(
    @Param('id') id: string,
    @Body() body: AdminReasonDto,
    @Req() request: AdminRequest,
  ) {
    return this.adminBillingService.deactivatePromotionCode(
      id,
      body.reason,
      this.actorContext(request),
    );
  }

  @Post('users/:id/subscription/schedule-cancellation')
  scheduleSubscriptionCancellation(
    @Param('id', ParseUserIdPipe) id: string,
    @Body() body: AdminReasonDto,
    @Req() request: AdminRequest,
  ) {
    return this.adminBillingService.setCancellationAtPeriodEnd(
      id,
      true,
      body.reason,
      this.actorContext(request),
    );
  }

  @Post('users/:id/subscription/revoke-cancellation')
  revokeSubscriptionCancellation(
    @Param('id', ParseUserIdPipe) id: string,
    @Body() body: AdminReasonDto,
    @Req() request: AdminRequest,
  ) {
    return this.adminBillingService.setCancellationAtPeriodEnd(
      id,
      false,
      body.reason,
      this.actorContext(request),
    );
  }

  private actorContext(request: AdminRequest): AdminActorContext {
    return {
      userId: request.user.id,
      sessionId: request.user.authSessionId,
      ipAddress: request.ip,
    };
  }
}
