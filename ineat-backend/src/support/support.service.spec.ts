import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { EmailService } from '../email/email.service';
import { RedisService } from '../redis/redis.service';
import {
  CreateSupportMessageDto,
  SupportSubject,
} from './dto/create-support-message.dto';
import { SupportService } from './support.service';

describe('SupportService', () => {
  const emailService = { sendSupportRequest: jest.fn() };
  const redis = {
    status: 'ready',
    connect: jest.fn(),
    eval: jest.fn(),
  };
  const redisService = { producerConnection: () => redis };
  const configService = {
    get: jest.fn((_key: string, fallback: string) => fallback),
  };
  const user = {
    id: 'user-1',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
  };

  let service: SupportService;

  beforeEach(async () => {
    jest.clearAllMocks();
    redis.status = 'ready';
    redis.eval.mockResolvedValue(1);
    emailService.sendSupportRequest.mockResolvedValue({ messageId: 'mail-1' });

    const module = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: EmailService, useValue: emailService },
        { provide: RedisService, useValue: redisService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    service = module.get(SupportService);
  });

  it('sends an authenticated feature request to support', async () => {
    const dto: CreateSupportMessageDto = {
      subject: SupportSubject.FEATURE_REQUEST,
      message: '  Je souhaite pouvoir partager une liste.  ',
    };

    await expect(service.sendMessage(user, dto)).resolves.toEqual({
      success: true,
      message: 'Votre message a bien été envoyé au support.',
    });
    expect(emailService.sendSupportRequest).toHaveBeenCalledWith({
      to: 'support@ineat.store',
      categoryLabel: 'Proposer une fonctionnalité',
      message: 'Je souhaite pouvoir partager une liste.',
      user,
    });
  });

  it('rejects the sixth request within the rate-limit window', async () => {
    redis.eval.mockResolvedValue(6);

    await expect(
      service.sendMessage(user, {
        subject: SupportSubject.OTHER,
        message: 'Une demande suffisamment longue.',
      }),
    ).rejects.toBeInstanceOf(HttpException);
    expect(emailService.sendSupportRequest).not.toHaveBeenCalled();
  });

  it('returns a generic unavailable error when email delivery fails', async () => {
    emailService.sendSupportRequest.mockRejectedValue(
      new Error('provider secret details'),
    );

    await expect(
      service.sendMessage(user, {
        subject: SupportSubject.TECHNICAL_ISSUE,
        message: 'Le bouton ne répond plus du tout.',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
