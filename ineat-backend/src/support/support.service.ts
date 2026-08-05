import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { RedisService } from '../redis/redis.service';
import {
  CreateSupportMessageDto,
  SupportSubject,
} from './dto/create-support-message.dto';

const SUPPORT_CATEGORY_LABELS: Record<SupportSubject, string> = {
  [SupportSubject.ACCOUNT]: 'Mon compte',
  [SupportSubject.TECHNICAL_ISSUE]: 'Problème technique',
  [SupportSubject.ORDER_OR_SUBSCRIPTION]: 'Commande ou abonnement',
  [SupportSubject.FEATURE_REQUEST]: 'Proposer une fonctionnalité',
  [SupportSubject.OTHER]: 'Autre',
};

type SupportUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
};

@Injectable()
export class SupportService {
  private static readonly MAX_REQUESTS_PER_HOUR = 5;
  private static readonly WINDOW_SECONDS = 60 * 60;

  constructor(
    private readonly emailService: EmailService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async sendMessage(user: SupportUser, dto: CreateSupportMessageDto) {
    await this.assertRateLimit(user.id);

    try {
      await this.emailService.sendSupportRequest({
        to: this.configService.get<string>(
          'SUPPORT_EMAIL',
          'support@ineat.store',
        ),
        categoryLabel: SUPPORT_CATEGORY_LABELS[dto.subject],
        message: dto.message.trim(),
        user,
      });
    } catch {
      throw new ServiceUnavailableException(
        "Votre message n'a pas pu être envoyé. Veuillez réessayer.",
      );
    }

    return {
      success: true,
      message: 'Votre message a bien été envoyé au support.',
    };
  }

  private async assertRateLimit(userId: string): Promise<void> {
    const key = `support:rate-limit:${userId}`;
    const redis = this.redisService.producerConnection();

    try {
      if (redis.status === 'wait') {
        await redis.connect();
      }
      const count = Number(
        await redis.eval(
          "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return count",
          1,
          key,
          SupportService.WINDOW_SECONDS,
        ),
      );

      if (count > SupportService.MAX_REQUESTS_PER_HOUR) {
        throw new HttpException(
          'Trop de messages envoyés. Veuillez réessayer dans une heure.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new ServiceUnavailableException(
        'Le service de support est temporairement indisponible.',
      );
    }
  }
}
