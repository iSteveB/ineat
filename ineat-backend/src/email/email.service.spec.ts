import { Test } from '@nestjs/testing';
import { ObservabilityService } from '../observability/observability.service';
import * as emailSender from './email-sender';
import { EmailService } from './email.service';

describe('EmailService', () => {
  const observability = {
    increment: jest.fn(),
    recordTiming: jest.fn(),
    trackEvent: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records successful sends without exposing recipient data', async () => {
    const transport = { send: jest.fn() };
    jest
      .spyOn(emailSender, 'getDefaultEmailTransport')
      .mockReturnValue(transport);
    jest
      .spyOn(emailSender, 'sendPasswordResetEmail')
      .mockResolvedValue({ messageId: 'email-123' });
    const module = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ObservabilityService, useValue: observability },
      ],
    }).compile();

    await module.get(EmailService).sendPasswordReset({
      to: 'private@example.com',
      resetUrl: 'https://ineat.store/reset?token=secret',
    });

    expect(observability.increment).toHaveBeenCalledWith(
      'email.password_reset.sent',
    );
    expect(observability.recordTiming).toHaveBeenCalledWith(
      'email.send.duration',
      expect.any(Number),
      { type: 'password_reset' },
    );
    expect(observability.trackEvent).not.toHaveBeenCalled();
  });

  it('records provider failures with non-sensitive context', async () => {
    jest
      .spyOn(emailSender, 'getDefaultEmailTransport')
      .mockReturnValue({ send: jest.fn() });
    jest
      .spyOn(emailSender, 'sendPasswordResetEmail')
      .mockRejectedValue(new Error('provider unavailable'));
    const module = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ObservabilityService, useValue: observability },
      ],
    }).compile();

    await expect(
      module.get(EmailService).sendPasswordReset({
        to: 'private@example.com',
        resetUrl: 'https://ineat.store/reset?token=secret',
      }),
    ).rejects.toThrow('provider unavailable');

    expect(observability.trackEvent).toHaveBeenCalledWith(
      'email.send.failed',
      'error',
      'Transactional email send failed',
      { type: 'password_reset', errorName: 'Error' },
    );
    expect(JSON.stringify(observability.trackEvent.mock.calls)).not.toContain(
      'private@example.com',
    );
    expect(JSON.stringify(observability.trackEvent.mock.calls)).not.toContain(
      'token=secret',
    );
  });

  it('sends and observes the account deletion confirmation', async () => {
    jest
      .spyOn(emailSender, 'getDefaultEmailTransport')
      .mockReturnValue({ send: jest.fn() });
    const send = jest
      .spyOn(emailSender, 'sendAccountDeletedEmail')
      .mockResolvedValue({ messageId: 'email-deleted' });
    const module = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ObservabilityService, useValue: observability },
      ],
    }).compile();

    await module.get(EmailService).sendAccountDeleted({
      to: 'private@example.com',
      userId: 'user-1',
      firstName: 'Jane',
    });

    expect(send).toHaveBeenCalledWith(
      {
        to: 'private@example.com',
        userId: 'user-1',
        firstName: 'Jane',
      },
      expect.anything(),
    );
    expect(observability.increment).toHaveBeenCalledWith(
      'email.account_deleted.sent',
    );
  });
});
