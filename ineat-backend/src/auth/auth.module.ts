import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ObservabilityModule } from '../observability/observability.module';

// Contrôleurs
import { AuthController } from './controllers/auth.controller';

// Services
import { AuthService } from './services/auth.service';
import { AccessPolicyService } from './services/access-policy.service';
import { UsageQuotaService } from './services/usage-quota.service';
import { BetterAuthSessionService } from './services/better-auth-session.service';

// Guards
import { AdminGuard } from './guards/admin.guard';
import { PremiumGuard } from './guards/premium.guard';
import { RoleGuard } from './guards/role.guard';
import { CapabilityGuard } from './guards/capability.guard';

@Global()
@Module({
  imports: [
    PrismaModule,
    ObservabilityModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessPolicyService,
    UsageQuotaService,
    BetterAuthSessionService,
    RoleGuard,
    CapabilityGuard,
    AdminGuard,
    PremiumGuard,
  ],
  exports: [
    AuthService,
    AccessPolicyService,
    UsageQuotaService,
    BetterAuthSessionService,
    RoleGuard,
    CapabilityGuard,
    AdminGuard,
    PremiumGuard,
  ],
})
export class AuthModule {}
