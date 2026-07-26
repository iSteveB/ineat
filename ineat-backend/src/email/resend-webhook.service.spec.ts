import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ResendWebhookEvent } from '../../prisma/generated/prisma/client';
import { Resend } from 'resend';
import { ObservabilityService } from '../observability/observability.service';
import { PrismaService } from '../prisma/prisma.service';
import { ResendWebhookService } from './resend-webhook.service';

jest.mock('resend');

describe('ResendWebhookService', () => {
  const verify = jest.fn();
  const create = jest.fn();
  const upsertSuppression = jest.fn();
  const increment = jest.fn();
  const trackEvent = jest.fn();
  const config = {
    get: jest.fn((key: string) =>
      key === 'RESEND_API_KEY' ? 're_test' : 'whsec_test',
    ),
  };
  const service = new ResendWebhookService(
    config as unknown as ConfigService,
    {
      resendWebhookEvent: { create },
      emailSuppression: { upsert: upsertSuppression },
    } as unknown as PrismaService,
    { increment, trackEvent } as unknown as ObservabilityService,
  );
  const headers = {
    id: 'msg_123',
    timestamp: '1234567890',
    signature: 'v1,signature',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Resend as jest.MockedClass<typeof Resend>).mockImplementation(
      () => ({ webhooks: { verify } }) as never,
    );
  });

  it('verifies, persists and records a delivery event', async () => {
    verify.mockReturnValue({
      type: 'email.delivered',
      created_at: '2026-07-26T20:00:00.000Z',
      data: {
        email_id: 'email_123',
        tags: {
          email_type: 'email_verification',
          recipient_ref: 'abc123',
        },
      },
    });
    create.mockResolvedValue({} as ResendWebhookEvent);

    await expect(service.process('{}', headers)).resolves.toEqual({
      received: true,
      duplicate: false,
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        id: 'msg_123',
        type: 'email.delivered',
        emailId: 'email_123',
        emailType: 'email_verification',
        recipientRef: 'abc123',
        eventAt: new Date('2026-07-26T20:00:00.000Z'),
      },
    });
    expect(increment).toHaveBeenCalledWith('email.webhook.email.delivered');
  });

  it('suppresses non-essential email after a complaint', async () => {
    verify.mockReturnValue({
      type: 'email.complained',
      created_at: '2026-07-26T20:00:00.000Z',
      data: {
        email_id: 'email_123',
        tags: { email_type: 'welcome', recipient_ref: 'abc123' },
      },
    });
    upsertSuppression.mockResolvedValue({});
    create.mockResolvedValue({} as ResendWebhookEvent);

    await service.process('{}', headers);

    expect(upsertSuppression).toHaveBeenCalledWith({
      where: { recipientRef: 'abc123' },
      create: { recipientRef: 'abc123', reason: 'email.complained' },
      update: { reason: 'email.complained' },
    });
    expect(trackEvent).toHaveBeenCalledWith(
      'email.complained',
      'warn',
      expect.any(String),
      {
        emailId: 'email_123',
        emailType: 'welcome',
        recipientRef: 'abc123',
      },
    );
  });

  it('acknowledges a duplicate without processing it twice', async () => {
    verify.mockReturnValue({
      type: 'email.delivered',
      created_at: '2026-07-26T20:00:00.000Z',
      data: { email_id: 'email_123' },
    });
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '7.1.0',
      }),
    );

    await expect(service.process('{}', headers)).resolves.toEqual({
      received: true,
      duplicate: true,
    });
    expect(increment).toHaveBeenCalledWith('email.webhook.duplicate');
    expect(increment).not.toHaveBeenCalledWith('email.webhook.email.delivered');
  });

  it('rejects an invalid signature', async () => {
    verify.mockImplementation(() => {
      throw new Error('invalid');
    });

    await expect(service.process('{}', headers)).rejects.toThrow(
      BadRequestException,
    );
    expect(create).not.toHaveBeenCalled();
  });
});
