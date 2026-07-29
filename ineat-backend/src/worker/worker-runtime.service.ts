import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Job, Worker } from 'bullmq';
import { QueueService } from '../jobs/queue.service';
import { DailyProductDigestService } from '../notification/daily-product-digest.service';
import { NotificationDeliveryService } from '../notification/notification-delivery.service';
import { NotificationService } from '../notification/notification.service';
import { WeeklyProductDigestService } from '../notification/weekly-product-digest.service';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_NAMES, type QueueName } from '../redis/redis.constants';
import { RedisService } from '../redis/redis.service';
import { ObservabilityService } from '../observability/observability.service';

const USER_BATCH_SIZE = 100;

type SynchronizeUserJob = { userId: string };

@Injectable()
export class WorkerRuntimeService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(WorkerRuntimeService.name);
  private readonly workers: Worker[] = [];

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly queues: QueueService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly deliveries: NotificationDeliveryService,
    private readonly weeklyDigests: WeeklyProductDigestService,
    private readonly dailyDigests: DailyProductDigestService,
    @Optional() private readonly observability?: ObservabilityService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.startWorker(QUEUE_NAMES.system, this.processSystemJob.bind(this), 1);

    if (this.schedulerMode() !== 'bullmq') {
      this.logger.warn(
        'Notification workers are disabled; set NOTIFICATION_SCHEDULER_MODE=bullmq to enable them',
      );
      return;
    }

    this.startWorker(
      QUEUE_NAMES.notificationsSync,
      this.processNotificationSyncJob.bind(this),
      this.workerConcurrency(),
    );
    this.startWorker(
      QUEUE_NAMES.notificationDelivery,
      this.processDeliveryJob.bind(this),
      1,
    );
    this.startWorker(
      QUEUE_NAMES.dailyDigest,
      async () => this.dailyDigests.sendDueDigests(),
      1,
    );
    this.startWorker(
      QUEUE_NAMES.weeklyDigest,
      async () => this.weeklyDigests.sendDueDigests(),
      1,
    );
    this.startWorker(
      QUEUE_NAMES.notificationMaintenance,
      async () => this.notifications.purgeExpiredNotifications(),
      1,
    );

    await this.registerSchedulers();
    await this.enqueueStartupJobs();
    this.logger.log('Notification workers and schedulers are enabled');
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.close()));
  }

  private startWorker(
    queueName: QueueName,
    processor: (job: Job) => Promise<unknown>,
    concurrency: number,
  ): void {
    const worker = new Worker(queueName, processor, {
      connection: this.redis.workerConnection(),
      concurrency,
      prefix: this.queuePrefix(),
    });

    worker.on('ready', () =>
      this.logger.log(`BullMQ worker ready: ${queueName}`),
    );
    worker.on('completed', (job) => {
      this.observability?.increment(`queues.${queueName}.completed`);
      if (job.processedOn && job.finishedOn) {
        this.observability?.recordTiming(
          `queues.${queueName}.duration`,
          job.finishedOn - job.processedOn,
          { jobName: job.name },
        );
      }
    });
    worker.on('failed', (job, error) => {
      this.observability?.increment(`queues.${queueName}.failed`);
      this.observability?.trackEvent(
        'queue.job.failed',
        'error',
        'BullMQ job failed',
        {
          queueName,
          jobName: job?.name ?? 'unknown',
          jobId: job?.id ?? 'unknown',
          attempt: job?.attemptsMade ?? 0,
          error,
        },
      );
      this.logger.error(
        `Job failed queue=${queueName} jobId=${job?.id ?? 'unknown'} attempt=${job?.attemptsMade ?? 0}: ${error.message}`,
      );
    });
    worker.on('error', (error) => {
      this.observability?.trackEvent(
        'queue.worker.error',
        'error',
        'BullMQ worker connection error',
        { queueName, error },
      );
      this.logger.error(
        `BullMQ worker error queue=${queueName}: ${error.message}`,
      );
    });
    this.workers.push(worker);
  }

  private async processSystemJob(job: Job): Promise<unknown> {
    if (job.name !== 'ping') {
      throw new Error(`Unsupported system job: ${job.name}`);
    }
    return { pong: true, processedAt: new Date().toISOString() };
  }

  private async processNotificationSyncJob(job: Job): Promise<unknown> {
    if (job.name === 'fan-out') {
      return this.fanOutUserSynchronization(job.data?.periodKey);
    }
    if (job.name === 'synchronize-user') {
      const { userId } = job.data as SynchronizeUserJob;
      if (!userId) throw new Error('Missing userId');
      await this.notifications.synchronizeUser(userId);
      return { userId };
    }
    throw new Error(`Unsupported notification sync job: ${job.name}`);
  }

  private async fanOutUserSynchronization(periodKey?: string): Promise<{
    scheduledUsers: number;
  }> {
    const effectivePeriodKey = periodKey || this.utcHourKey();
    let cursor: string | undefined;
    let scheduledUsers = 0;

    do {
      const users = await this.prisma.user.findMany({
        select: { id: true },
        orderBy: { id: 'asc' },
        take: USER_BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      await this.queues.addBulk<SynchronizeUserJob>(
        QUEUE_NAMES.notificationsSync,
        users.map(({ id }) => ({
          name: 'synchronize-user',
          data: { userId: id },
          opts: { jobId: `sync-${effectivePeriodKey}-${id}` },
        })),
      );
      scheduledUsers += users.length;
      cursor = users.at(-1)?.id;
      if (users.length < USER_BATCH_SIZE) break;
    } while (cursor);

    this.logger.log(
      `Notification synchronization scheduled for ${scheduledUsers} users`,
    );
    return { scheduledUsers };
  }

  private async processDeliveryJob(job: Job): Promise<void> {
    if (job.name === 'retry-pending') {
      await this.deliveries.retryPendingDeliveries();
      return;
    }
    if (job.name === 'deliver-email') {
      const deliveryId = job.data?.deliveryId as string | undefined;
      if (!deliveryId) throw new Error('Missing deliveryId');
      await this.deliveries.processQueuedEmailDelivery(deliveryId);
      return;
    }
    throw new Error(`Unsupported notification delivery job: ${job.name}`);
  }

  private async registerSchedulers(): Promise<void> {
    await Promise.all([
      this.queues.upsertScheduler(
        QUEUE_NAMES.notificationsSync,
        'notifications-hourly',
        { pattern: '0 * * * *' },
        { name: 'fan-out', data: {} },
      ),
      this.queues.upsertScheduler(
        QUEUE_NAMES.notificationDelivery,
        'notification-delivery-retry',
        { every: 5 * 60_000 },
        { name: 'retry-pending', data: {} },
      ),
      this.queues.upsertScheduler(
        QUEUE_NAMES.dailyDigest,
        'daily-digest-hourly',
        { pattern: '5 * * * *' },
        { name: 'send-due', data: {} },
      ),
      this.queues.upsertScheduler(
        QUEUE_NAMES.weeklyDigest,
        'weekly-digest-hourly',
        { pattern: '10 * * * *' },
        { name: 'send-due', data: {} },
      ),
      this.queues.upsertScheduler(
        QUEUE_NAMES.notificationMaintenance,
        'notification-retention-daily',
        { pattern: '0 3 * * *' },
        { name: 'purge-expired', data: {} },
      ),
    ]);
  }

  private async enqueueStartupJobs(): Promise<void> {
    const periodKey = this.utcHourKey();
    await Promise.all([
      this.queues.add(
        QUEUE_NAMES.notificationsSync,
        'fan-out',
        { periodKey },
        { jobId: `startup-sync-${periodKey}` },
      ),
      this.queues.add(
        QUEUE_NAMES.notificationDelivery,
        'retry-pending',
        {},
        { jobId: `startup-delivery-${periodKey}` },
      ),
      this.queues.add(
        QUEUE_NAMES.dailyDigest,
        'send-due',
        {},
        { jobId: `startup-daily-${periodKey}` },
      ),
      this.queues.add(
        QUEUE_NAMES.weeklyDigest,
        'send-due',
        {},
        { jobId: `startup-weekly-${periodKey}` },
      ),
    ]);
  }

  private schedulerMode(): string {
    return this.config.get<string>('NOTIFICATION_SCHEDULER_MODE', 'legacy');
  }

  private workerConcurrency(): number {
    const configured = Number(
      this.config.get<string>('NOTIFICATION_WORKER_CONCURRENCY'),
    );
    return Number.isFinite(configured) && configured >= 1
      ? Math.min(Math.trunc(configured), 20)
      : 5;
  }

  private queuePrefix(): string {
    return (
      this.config.get<string>('REDIS_KEY_PREFIX')?.trim() ||
      `ineat:${this.config.get<string>('NODE_ENV', 'development')}`
    );
  }

  private utcHourKey(now = new Date()): string {
    return now
      .toISOString()
      .slice(0, 13)
      .replace(/[^0-9]/g, '');
  }
}
