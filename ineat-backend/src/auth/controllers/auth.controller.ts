import {
  Controller,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { SessionAuthGuard } from '../guards/session-auth.guard';
import { Request as ExpressRequest } from 'express';
import { toSafeUserResponseWithUsage } from '../auth-user-response';
import { AccessPolicyService } from '../services/access-policy.service';
import { UsageQuotaService } from '../services/usage-quota.service';

interface RequestWithUser extends ExpressRequest {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profileType: string;
    role?: string;
    subscriptionPlan?: string;
    subscriptionStatus?: string;
    trialStartedAt?: Date | null;
    trialEndsAt?: Date | null;
    currentPeriodStartedAt?: Date | null;
    currentPeriodEndsAt?: Date | null;
    preferences?: any;
    createdAt: Date;
    updatedAt: Date;
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private accessPolicyService: AccessPolicyService,
    private usageQuotaService: UsageQuotaService,
  ) {}

  @UseGuards(SessionAuthGuard)
  @Get('profile')
  getProfile(@Request() req: RequestWithUser) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(SessionAuthGuard)
  @Get('check')
  async checkAuth(@Request() req: RequestWithUser) {
    // Si cette route est atteinte, cela signifie que l'utilisateur est authentifié
    // car SessionAuthGuard aurait rejeté la requête sinon
    return {
      success: true,
      data: {
        isAuthenticated: true,
        user: {
          ...(await toSafeUserResponseWithUsage(
            req.user as any,
            this.accessPolicyService,
            this.usageQuotaService,
          )),
        },
      },
    };
  }

}
