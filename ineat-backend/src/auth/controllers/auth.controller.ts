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
import { Request as ExpressRequest } from 'express';
import { Response as ExpressResponse } from 'express';
import { User } from '@prisma/client';

interface RequestWithUser extends ExpressRequest {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profileType: string;
    subscription?: string;
    preferences?: any;
    createdAt: Date;
    updatedAt: Date;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
  checkAuth(@Request() req: RequestWithUser) {
    // Si cette route est atteinte, cela signifie que l'utilisateur est authentifié
    // car JwtAuthGuard aurait rejeté la requête sinon
    return {
      success: true,
      data: {
        isAuthenticated: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          profileType: req.user.profileType,
          subscription: req.user.subscription || 'FREE',
          preferences: req.user.preferences,
          createdAt: req.user.createdAt.toISOString(),
          updatedAt: req.user.updatedAt.toISOString(),
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
