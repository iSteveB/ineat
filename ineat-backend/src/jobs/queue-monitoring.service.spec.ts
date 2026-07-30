import { QUEUE_NAMES } from '../redis/redis.constants';
import { QueueMonitoringService } from './queue-monitoring.service';

describe('QueueMonitoringService', () => {
  const queue = {
    getJobCounts: jest.fn(),
    getJobs: jest.fn(),
    getJob: jest.fn(),
  };
  const queues = { queue: jest.fn().mockReturnValue(queue) };
  const config = { get: jest.fn().mockReturnValue(undefined) };
  const observability = { trackEvent: jest.fn() };
  const prisma = {
    notificationDelivery: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queues.queue.mockReturnValue(queue);
    config.get.mockReturnValue(undefined);
    queue.getJobCounts.mockResolvedValue({
      waiting: 0,
      active: 0,
      delayed: 1,
      failed: 0,
      completed: 10,
      paused: 0,
    });
    queue.getJobs.mockResolvedValue([]);
    queue.getJob.mockResolvedValue(null);
  });

  it('returns sanitized failures without exposing job payloads', async () => {
    const service = new QueueMonitoringService(
      queues as any,
      config as any,
      observability as any,
      prisma as any,
    );

    const snapshot = await service.getSnapshot();

    expect(snapshot.health).toBe('healthy');
    expect(snapshot.queues).toHaveLength(Object.keys(QUEUE_NAMES).length);
    expect(snapshot.queues[0]).toEqual(
      expect.objectContaining({
        health: 'healthy',
        oldestWaitingAgeMs: 0,
        recentFailuresLastHour: 0,
      }),
    );
    expect(snapshot.queues[0]).toHaveProperty('failedJobs', []);
  });

  it('exposes only safe metadata for failed jobs', async () => {
    queue.getJobs.mockImplementation((types: string[]) =>
      types.includes('failed')
        ? Promise.resolve([
            {
              id: 'job-1',
              name: 'deliver-email',
              attemptsMade: 3,
              failedReason:
                'SMTP failed\nBearer private-token https://x.test?token=secret',
              finishedOn: Date.now(),
              timestamp: Date.now() - 1000,
              data: { token: 'never-expose-me' },
            },
          ])
        : Promise.resolve([]),
    );
    const service = new QueueMonitoringService(
      queues as any,
      config as any,
      observability as any,
      prisma as any,
    );

    const snapshot = await service.getSnapshot();

    expect(snapshot.queues[0].failedJobs[0]).toEqual(
      expect.objectContaining({
        id: 'job-1',
        name: 'deliver-email',
        attemptsMade: 3,
        failedReason:
          'SMTP failed Bearer [redacted] https://x.test?token=[redacted]',
      }),
    );
    expect(snapshot.queues[0].failedJobs[0]).not.toHaveProperty('data');
  });

  it('marks a queue degraded when its backlog reaches the warning threshold', async () => {
    queue.getJobCounts.mockResolvedValue({
      waiting: 100,
      active: 1,
      delayed: 0,
      failed: 0,
      completed: 0,
      paused: 0,
    });
    const service = new QueueMonitoringService(
      queues as any,
      config as any,
      observability as any,
      prisma as any,
    );

    const snapshot = await service.getSnapshot();

    expect(snapshot.health).toBe('degraded');
    expect(snapshot.queues.every((item) => item.health === 'degraded')).toBe(
      true,
    );
  });

  it('marks a queue critical when an old waiting job exceeds the lag threshold', async () => {
    queue.getJobs.mockImplementation((types: string[]) =>
      types.includes('waiting')
        ? Promise.resolve([{ timestamp: Date.now() - 31 * 60_000 }])
        : Promise.resolve([]),
    );
    const service = new QueueMonitoringService(
      queues as any,
      config as any,
      observability as any,
      prisma as any,
    );

    const snapshot = await service.getSnapshot();

    expect(snapshot.health).toBe('critical');
  });

  it('retries a failed job and records an audit event', async () => {
    const job = {
      id: 'job-1',
      name: 'deliver-email',
      attemptsMade: 3,
      data: { deliveryId: 'delivery-1' },
      getState: jest.fn().mockResolvedValue('failed'),
      retry: jest.fn().mockResolvedValue(undefined),
    };
    queue.getJob.mockResolvedValue(job);
    const service = new QueueMonitoringService(
      queues as any,
      config as any,
      observability as any,
      prisma as any,
    );

    const result = await service.retryFailedJob(
      QUEUE_NAMES.notificationDelivery,
      job.id,
    );

    expect(job.retry).toHaveBeenCalledWith('failed');
    expect(prisma.notificationDelivery.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'delivery-1' }),
        data: expect.objectContaining({ attemptCount: 0 }),
      }),
    );
    expect(result).toEqual({
      queueName: QUEUE_NAMES.notificationDelivery,
      jobId: job.id,
      jobName: job.name,
      state: 'waiting',
    });
    expect(observability.trackEvent).toHaveBeenCalledWith(
      'queue.job.retried',
      'warn',
      expect.any(String),
      expect.objectContaining({ jobId: job.id }),
    );
  });

  it('refuses unknown queues before looking up a job', async () => {
    const service = new QueueMonitoringService(
      queues as any,
      config as any,
      observability as any,
      prisma as any,
    );

    await expect(service.retryFailedJob('arbitrary', 'job-1')).rejects.toThrow(
      'File BullMQ inconnue',
    );
  });

  it('refuses to retry a job that is not failed', async () => {
    queue.getJob.mockResolvedValue({
      id: 'job-1',
      getState: jest.fn().mockResolvedValue('active'),
    });
    const service = new QueueMonitoringService(
      queues as any,
      config as any,
      observability as any,
      prisma as any,
    );

    await expect(
      service.retryFailedJob(QUEUE_NAMES.system, 'job-1'),
    ).rejects.toThrow('Seul un job échoué peut être rejoué');
  });
});
