import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationType,
} from '../../prisma/generated/prisma/client';
import { NotificationDeliveryService } from './notification-delivery.service';

describe('NotificationDeliveryService', () => {
  const notification = {
    id: 'notification-1',
    userId: 'user-1',
    type: NotificationType.EXPIRY,
    title: 'Produit bientôt périmé',
    message: 'Le lait expire demain.',
    isRead: false,
    referenceId: 'item-1',
    referenceType: 'inventory_item',
    deduplicationKey: 'deduplication-key',
    dismissedAt: null,
    resolvedAt: null,
    lastOccurredAt: new Date(),
    occurrenceVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const delivery = {
    id: 'delivery-1',
    notificationId: notification.id,
    channel: NotificationChannel.EMAIL,
    occurrenceVersion: 1,
    status: NotificationDeliveryStatus.PENDING,
    attemptCount: 0,
    providerMessageId: null,
    errorMessage: null,
    nextAttemptAt: null,
    sentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    Notification: {
      ...notification,
      User: { email: 'user@example.com' },
    },
  };

  const createContext = (
    claimCount = 1,
    suppressed = false,
    withQueue = false,
  ) => {
    const sendNotificationAlert = jest
      .fn()
      .mockResolvedValue({ messageId: 'message-1' });
    const prisma = {
      notificationPreferences: {
        findUnique: jest.fn().mockResolvedValue({
          emailEnabled: true,
          expiry: true,
          budget: true,
          system: true,
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ email: 'user@example.com' }),
      },
      notificationDelivery: {
        upsert: jest.fn().mockResolvedValue(delivery),
        findUnique: jest.fn().mockResolvedValue(delivery),
        updateMany: jest.fn().mockResolvedValue({ count: claimCount }),
        update: jest.fn().mockResolvedValue(delivery),
        findMany: jest.fn().mockResolvedValue([]),
      },
      emailSuppression: {
        findUnique: jest
          .fn()
          .mockResolvedValue(suppressed ? { recipientRef: 'ref' } : null),
      },
    };
    const queues = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    const config = {
      get: jest.fn().mockReturnValue(withQueue ? 'bullmq' : 'legacy'),
    };
    const service = new NotificationDeliveryService(
      prisma as never,
      { sendNotificationAlert } as never,
      undefined,
      withQueue ? (queues as never) : undefined,
      config as never,
    );
    return { service, prisma, queues, sendNotificationAlert };
  };

  const previousEmailEnabled = process.env.EMAIL_ENABLED;

  beforeEach(() => {
    process.env.EMAIL_ENABLED = 'true';
  });

  afterAll(() => {
    process.env.EMAIL_ENABLED = previousEmailEnabled;
  });

  it('sends an enabled email delivery and records the provider message', async () => {
    const { service, prisma, sendNotificationAlert } = createContext();

    await service.dispatchOccurrence(notification);

    expect(sendNotificationAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationId: notification.id,
        occurrenceVersion: 1,
        actionUrl: 'http://localhost:5173/app/inventory',
      }),
    );
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: NotificationDeliveryStatus.SENT,
          providerMessageId: 'message-1',
        }),
      }),
    );
  });

  it('does not send when another worker already claimed the delivery', async () => {
    const { service, sendNotificationAlert } = createContext(0);

    await service.dispatchOccurrence(notification);

    expect(sendNotificationAlert).not.toHaveBeenCalled();
  });

  it('marks suppressed recipients without calling the provider', async () => {
    const { service, prisma, sendNotificationAlert } = createContext(1, true);

    await service.dispatchOccurrence(notification);

    expect(sendNotificationAlert).not.toHaveBeenCalled();
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: NotificationDeliveryStatus.SUPPRESSED,
        }),
      }),
    );
  });

  it('enqueues an email delivery with a deterministic occurrence id', async () => {
    const { service, queues, sendNotificationAlert } = createContext(
      1,
      false,
      true,
    );

    await service.dispatchOccurrence(notification);

    expect(sendNotificationAlert).not.toHaveBeenCalled();
    expect(queues.add).toHaveBeenCalledWith(
      'notification-delivery',
      'deliver-email',
      { deliveryId: delivery.id },
      expect.objectContaining({
        jobId: 'delivery-notification-1-email-1',
        attempts: 3,
      }),
    );
  });

  it('rethrows provider failures so BullMQ can retry the job', async () => {
    const { service, sendNotificationAlert } = createContext();
    sendNotificationAlert.mockRejectedValueOnce(
      new Error('Resend unavailable'),
    );

    await expect(
      service.processQueuedEmailDelivery(delivery.id),
    ).rejects.toThrow('Resend unavailable');
  });
});
