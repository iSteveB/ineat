import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';

// Stratégies
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

// Contrôleurs
import { AuthController } from './controllers/auth.controller';
import { OAuthController } from './controllers/oauth.controller';

// Services
import { AuthService } from './services/auth.service';

// Guards
import { AdminGuard } from './guards/admin.guard';
import { PremiumGuard } from './guards/premium.guard';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({
      session: false,
      defaultStrategy: 'jwt',
    }),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1d'),
        },
      }),
    }),
  ],
  controllers: [AuthController, OAuthController],
  providers: [
    // Services et stratégies
    AuthService,
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
    // Guards
    AdminGuard,
    PremiumGuard,
  ],
  exports: [AuthService, AdminGuard, PremiumGuard],
})
export class AuthModule {}
