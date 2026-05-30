import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import type { StringValue } from 'ms'
import { ObservabilityModule } from '../observability/observability.module';

// Stratégies
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

// Contrôleurs
import { AuthController } from './controllers/auth.controller';
import { OAuthController } from './controllers/oauth.controller';

// Services
import { AuthService } from './services/auth.service';
import { AccessPolicyService } from './services/access-policy.service';
import { UsageQuotaService } from './services/usage-quota.service';

// Guards
import { AdminGuard } from './guards/admin.guard';
import { PremiumGuard } from './guards/premium.guard';
import { RoleGuard } from './guards/role.guard';
import { CapabilityGuard } from './guards/capability.guard';

@Module({
  imports: [
    PrismaModule,
    ObservabilityModule,
    PassportModule.register({
      session: false,
      defaultStrategy: 'jwt',
    }),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ?? '1d') as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController, OAuthController],
  providers: [
    AuthService,
    AccessPolicyService,
    UsageQuotaService,
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
    RoleGuard,
    CapabilityGuard,
    AdminGuard,
    PremiumGuard,
  ],
  exports: [
    AuthService,
    AccessPolicyService,
    UsageQuotaService,
    RoleGuard,
    CapabilityGuard,
    AdminGuard,
    PremiumGuard,
  ],
})
export class AuthModule {}
