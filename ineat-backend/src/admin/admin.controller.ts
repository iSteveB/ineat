import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  SubscriptionPlan,
  UserRole,
} from '../../prisma/generated/prisma/enums';
import { RequiresRole } from '../auth/decorators/requires-role.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { AdminService } from './admin.service';

type UpdateRoleBody = {
  role: UserRole;
};

type UpdateSubscriptionPlanBody = {
  subscriptionPlan: SubscriptionPlan;
};

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@RequiresRole('ADMIN')
@UseGuards(JwtAuthGuard, RoleGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('observability')
  getObservability() {
    return this.adminService.getObservability();
  }

  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Get('users/:id')
  getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/role')
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRoleBody,
  ) {
    return this.adminService.updateUserRole(id, body.role);
  }

  @Patch('users/:id/subscription-plan')
  updateSubscriptionPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateSubscriptionPlanBody,
  ) {
    return this.adminService.updateSubscriptionPlan(id, body.subscriptionPlan);
  }
}
