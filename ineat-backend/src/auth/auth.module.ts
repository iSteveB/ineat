import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

// Modules
import { PrismaModule } from '../prisma/prisma.module';

// Stratégies
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

// Contrôleurs
import { AuthController } from './controllers/auth.controller';
import { OAuthController } from './controllers/oauth.controller';

// Services
import { AuthService } from './auth.service';

// Gardes et intercepteurs
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUserInterceptor } from './interceptors/current-user.interceptor';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
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

    // Gardes globaux
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    // Intercepteurs globaux
    {
      provide: APP_INTERCEPTOR,
      useClass: CurrentUserInterceptor,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
