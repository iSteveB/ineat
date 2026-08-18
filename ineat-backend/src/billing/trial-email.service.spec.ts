import { TrialEmailService } from './trial-email.service';

describe('TrialEmailService', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;
  const now = new Date('2026-07-29T12:00:00.000Z');
  const user = {
    id: 'user-1',
    email: 'jane@example.com',
    firstName: 'Jane',
    trialEndsAt: new Date('2026-07-30T10:00:00.000Z'),
  };

  const createService = () => {
    const prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const email = {
      sendTrialStarted: jest.fn().mockResolvedValue({ messageId: 'email-1' }),
      sendTrialReminder: jest.fn().mockResolvedValue({ messageId: 'email-2' }),
      sendTrialExpired: jest.fn().mockResolvedValue({ messageId: 'email-3' }),
    };
    return {
      service: new TrialEmailService(prisma as never, email as never),
      prisma,
      email,
    };
  };

  beforeEach(() => {
    process.env.FRONTEND_URL = 'https://frontend.test/';
  });

  afterAll(() => {
    if (originalFrontendUrl === undefined) {
      delete process.env.FRONTEND_URL;
      return;
    }
    process.env.FRONTEND_URL = originalFrontendUrl;
  });

  it('sends and records the trial-started email', async () => {
    const { service, prisma, email } = createService();
    prisma.user.findUnique.mockResolvedValue({
      ...user,
      trialStartedEmailSentAt: null,
    });

    await service.sendTrialStarted(user.id);

    expect(email.sendTrialStarted).toHaveBeenCalledWith(
      expect.objectContaining({
        to: user.email,
        userId: user.id,
        subscriptionUrl: 'https://frontend.test/app/subscription',
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { trialStartedEmailSentAt: expect.any(Date) },
    });
  });

  it('sends reminders only for trials in the next 24 hours', async () => {
    const { service, prisma, email } = createService();
    prisma.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([user])
      .mockResolvedValueOnce([]);

    await service.sendDueEmails(now);

    expect(prisma.user.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          trialEndsAt: {
            gt: now,
            lte: new Date('2026-07-30T12:00:00.000Z'),
          },
        }),
      }),
    );
    expect(email.sendTrialReminder).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { trialReminderEmailSentAt: expect.any(Date) },
    });
  });

  it('expires the trial before sending the expiration email', async () => {
    const { service, prisma, email } = createService();
    const expiredUser = {
      ...user,
      trialEndsAt: new Date('2026-07-29T10:00:00.000Z'),
    };
    prisma.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([expiredUser]);

    await service.sendDueEmails(now);

    expect(prisma.user.update).toHaveBeenNthCalledWith(1, {
      where: { id: user.id },
      data: { subscriptionStatus: 'EXPIRED' },
    });
    expect(email.sendTrialExpired).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenNthCalledWith(2, {
      where: { id: user.id },
      data: { trialExpiredEmailSentAt: expect.any(Date) },
    });
  });

  it('does not mark an email sent when delivery fails', async () => {
    const { service, prisma, email } = createService();
    prisma.user.findUnique.mockResolvedValue({
      ...user,
      trialStartedEmailSentAt: null,
    });
    email.sendTrialStarted.mockRejectedValue(new Error('Resend unavailable'));

    await expect(service.sendTrialStarted(user.id)).rejects.toThrow(
      'Resend unavailable',
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
