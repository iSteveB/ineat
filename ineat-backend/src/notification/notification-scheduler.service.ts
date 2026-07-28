import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { ObservabilityService } from '../observability/observability.service';
import { WeeklyProductDigestService } from './weekly-product-digest.service';
import { DailyProductDigestService } from './daily-product-digest.service';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;
const USER_BATCH_SIZE = 100;

@Injectable()
export class NotificationSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationSchedulerService.name);
  private timer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    @Optional() private readonly deliveries?: NotificationDeliveryService,
    @Optional() private readonly observability?: ObservabilityService,
    @Optional() private readonly weeklyDigests?: WeeklyProductDigestService,
    @Optional() private readonly dailyDigests?: DailyProductDigestService,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const intervalMs = this.getIntervalMs();
    this.timer = setInterval(() => void this.synchronizeAllUsers(), intervalMs);
    this.timer.unref();

    setImmediate(() => void this.synchronizeAllUsers());
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async synchronizeAllUsers(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Notification synchronization already running');
      return;
    }

    this.isRunning = true;
    let cursor: string | undefined;
    let synchronizedUsers = 0;
    let failedUsers = 0;

    try {
      do {
        const users = await this.prisma.user.findMany({
          select: { id: true },
          orderBy: { id: 'asc' },
          take: USER_BATCH_SIZE,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const results = await Promise.allSettled(
          users.map(({ id }) => this.notifications.synchronizeUser(id)),
        );
        synchronizedUsers += results.filter(
          ({ status }) => status === 'fulfilled',
        ).length;
        failedUsers += results.filter(
          ({ status }) => status === 'rejected',
        ).length;
        cursor = users.at(-1)?.id;

        if (users.length < USER_BATCH_SIZE) {
          break;
        }
      } while (cursor);

      this.logger.log(
        `Notification synchronization completed: ${synchronizedUsers} users, ${failedUsers} failures`,
      );
      this.observability?.increment(
        'notifications.synchronization.users',
        synchronizedUsers,
      );
      this.observability?.increment(
        'notifications.synchronization.failures',
        failedUsers,
      );
      await this.deliveries?.retryPendingDeliveries();
      await this.weeklyDigests?.sendDueDigests();
      await this.dailyDigests?.sendDueDigests();
      const purged = await this.notifications.purgeExpiredNotifications();
      if (purged > 0) {
        this.logger.log(`Notification retention purge: ${purged} rows`);
      }
    } catch (error) {
      this.observability?.trackEvent(
        'notifications.synchronization.failed',
        'error',
        'Notification synchronization failed',
        {
          errorName:
            error instanceof Error ? error.constructor.name : 'Unknown',
        },
      );
      this.logger.error('Notification synchronization failed', error);
    } finally {
      this.isRunning = false;
    }
  }

  private getIntervalMs(): number {
    const configured = Number(process.env.NOTIFICATION_SYNC_INTERVAL_MS);
    return Number.isFinite(configured) && configured >= 60_000
      ? configured
      : DEFAULT_INTERVAL_MS;
  }
}
