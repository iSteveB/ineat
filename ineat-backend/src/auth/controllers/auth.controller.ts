import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { validateRegisterDto, RegisterDto } from '../dto/register.dto';
import { validateLoginDto, LoginDto } from '../dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    try {
      const registerDto = validateRegisterDto(body);
      return this.authService.register(registerDto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Body() body: LoginDto) {
    try {
      // Validation du DTO (même si la garde a déjà validé les credentials)
      validateLoginDto(body);
      return this.authService.login(req.user);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }
}
