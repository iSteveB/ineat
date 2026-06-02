import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ObservabilityService } from '../../observability/observability.service';
import { authUserSelect } from '../auth-user.select';
import { toSafeUserResponseWithUsage } from '../auth-user-response';
import { AccessPolicyService } from './access-policy.service';
import { UsageQuotaService } from './usage-quota.service';
import { SafeUserDto } from '../dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private observabilityService: ObservabilityService,
    private accessPolicyService: AccessPolicyService,
    private usageQuotaService: UsageQuotaService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: authUserSelect,
    });

    if (!user) {
      this.observabilityService.trackEvent(
        'auth.profile.not_found',
        'warn',
        'Profile user not found',
        { userId },
      );
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;

    return {
      success: true,
      data: {
        ...(await toSafeUserResponseWithUsage(
          result as SafeUserDto,
          this.accessPolicyService,
          this.usageQuotaService,
        )),
      },
    };
  }
}
