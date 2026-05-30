import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  Response,
  BadRequestException,
  SetMetadata,
  HttpException,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import {
  validateRegisterDto,
  RegisterDto,
  validateLoginDto,
  LoginDto,
} from '../dto/auth.dto';
import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { User } from '../../../prisma/generated/prisma/client';
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

  @Post('register')
  @SetMetadata('isPublic', true)
  async register(
    @Body() body: RegisterDto,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    try {
      const registerDto = validateRegisterDto(body);
      return this.authService.register(registerDto, response);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @SetMetadata('isPublic', true)
  async login(
    @Request() req: RequestWithUser,
    @Body() body: LoginDto,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    try {
      // Validation du DTO (même si la garde a déjà validé les credentials)
      validateLoginDto(body);
      return this.authService.login(req.user as User, response);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: RequestWithUser) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('check')
  async checkAuth(@Request() req: RequestWithUser) {
    // Si cette route est atteinte, cela signifie que l'utilisateur est authentifié
    // car JwtAuthGuard aurait rejeté la requête sinon
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

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Request() req: RequestWithUser,
    @Response({ passthrough: true })
    response: ExpressResponse,
  ) {
    return this.authService.logout(response);
  }
}
