import { Worker } from 'bullmq';
import { QUEUE_NAMES } from '../redis/redis.constants';
import { WorkerRuntimeService } from './worker-runtime.service';

jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('WorkerRuntimeService', () => {
  const redis = { workerConnection: jest.fn().mockReturnValue({}) };
  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'NOTIFICATION_SCHEDULER_MODE') return 'bullmq';
      if (key === 'NODE_ENV') return 'test';
      return fallback;
    }),
  };
  const queues = {
    add: jest.fn().mockResolvedValue({}),
    addBulk: jest.fn().mockResolvedValue([]),
    upsertScheduler: jest.fn().mockResolvedValue({}),
  };
  const prisma = {
    user: { findMany: jest.fn() },
    adminAuditLog: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
  };
  const notifications = {
    synchronizeUser: jest.fn(),
    purgeExpiredNotifications: jest.fn(),
  };
  const deliveries = { retryPendingDeliveries: jest.fn() };
  const weeklyDigests = { sendDueDigests: jest.fn() };
  const dailyDigests = { sendDueDigests: jest.fn() };

  const createService = () =>
    new WorkerRuntimeService(
      redis as any,
      config as any,
      queues as any,
      prisma as any,
      notifications as any,
      deliveries as any,
      weeklyDigests as any,
      dailyDigests as any,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'NOTIFICATION_SCHEDULER_MODE') return 'bullmq';
      if (key === 'NODE_ENV') return 'test';
      return fallback;
    });
  });

  it('registers notification workers and repeatable schedules in BullMQ mode', async () => {
    const service = createService();

    await service.onModuleInit();

    expect(Worker).toHaveBeenCalledTimes(6);
    expect(queues.upsertScheduler).toHaveBeenCalledTimes(6);
    expect(queues.upsertScheduler).toHaveBeenCalledWith(
      QUEUE_NAMES.system,
      'admin-audit-retention-daily',
      { pattern: '30 3 * * *' },
      { name: 'purge-admin-audit', data: {} },
    );
    expect(queues.upsertScheduler).toHaveBeenCalledWith(
      QUEUE_NAMES.notificationsSync,
      'notifications-hourly',
      { pattern: '0 * * * *' },
      { name: 'fan-out', data: {} },
    );
    expect(queues.add).toHaveBeenCalledTimes(4);
  });

  it('keeps notification workers disabled outside BullMQ mode', async () => {
    config.get.mockImplementation((key: string, fallback?: string) =>
      key === 'NOTIFICATION_SCHEDULER_MODE' ? 'legacy' : fallback,
    );
    const service = createService();

    await service.onModuleInit();

    expect(Worker).toHaveBeenCalledTimes(1);
    expect(queues.upsertScheduler).toHaveBeenCalledTimes(1);
    expect(queues.upsertScheduler).toHaveBeenCalledWith(
      QUEUE_NAMES.system,
      'admin-audit-retention-daily',
      { pattern: '30 3 * * *' },
      { name: 'purge-admin-audit', data: {} },
    );
  });

  it('fans out users in bounded batches with deterministic job ids', async () => {
    const firstBatch = Array.from({ length: 100 }, (_, index) => ({
      id: `user-${index.toString().padStart(3, '0')}`,
    }));
    prisma.user.findMany
      .mockResolvedValueOnce(firstBatch)
      .mockResolvedValueOnce([{ id: 'user-100' }]);
    const service = createService();

    const result = await (service as any).fanOutUserSynchronization(
      '2026072909',
    );

    expect(result).toEqual({ scheduledUsers: 101 });
    expect(queues.addBulk).toHaveBeenCalledTimes(2);
    expect(queues.addBulk).toHaveBeenNthCalledWith(
      2,
      QUEUE_NAMES.notificationsSync,
      [
        {
          name: 'synchronize-user',
          data: { userId: 'user-100' },
          opts: { jobId: 'sync-2026072909-user-100' },
        },
      ],
    );
    expect(prisma.user.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cursor: { id: 'user-099' },
        skip: 1,
        take: 100,
      }),
    );
  });

  it('purges admin audit entries older than the configured retention', async () => {
    config.get.mockReturnValue(365 as any);
    prisma.adminAuditLog.deleteMany.mockResolvedValue({ count: 4 });
    const service = createService();

    const result = await (service as any).purgeExpiredAdminAuditLogs(
      new Date('2026-07-31T00:00:00.000Z'),
    );

    expect(prisma.adminAuditLog.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: new Date('2025-07-31T00:00:00.000Z') } },
    });
    expect(result).toEqual({
      deletedCount: 4,
      cutoff: '2025-07-31T00:00:00.000Z',
    });
  });
});
