import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';

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
    } catch (error) {
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
