import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES, type QueueName } from '../redis/redis.constants';
import { QueueService } from './queue.service';
import { ObservabilityService } from '../observability/observability.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDeliveryStatus } from '../../prisma/generated/prisma/client';

type QueueHealth = 'healthy' | 'degraded' | 'critical';

@Injectable()
export class QueueMonitoringService {
  constructor(
    private readonly queues: QueueService,
    private readonly config: ConfigService,
    private readonly observability: ObservabilityService,
    private readonly prisma: PrismaService,
  ) {}

  async getSnapshot() {
    const queues = await Promise.all(
      Object.values(QUEUE_NAMES).map((name) => this.getQueueSnapshot(name)),
    );
    const health = queues.reduce<QueueHealth>(
      (current, queue) => this.worstHealth(current, queue.health),
      'healthy',
    );

    return {
      timestamp: new Date().toISOString(),
      health,
      queues,
      thresholds: this.thresholds(),
    };
  }

  async retryFailedJob(queueName: string, jobId: string) {
    const name = this.parseQueueName(queueName);
    const job = await this.queues.queue(name).getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job introuvable');
    }

    const state = await job.getState();
    if (state !== 'failed') {
      throw new BadRequestException(
        `Seul un job échoué peut être rejoué (état actuel: ${state})`,
      );
    }

    const persistentDeliveryReset = await this.resetPersistentDelivery(
      name,
      job.name,
      job.data,
    );
    await job.retry('failed');
    this.observability.trackEvent(
      'queue.job.retried',
      'warn',
      'Failed BullMQ job manually retried by an administrator',
      {
        queueName: name,
        jobName: job.name,
        jobId: job.id ?? jobId,
        previousAttempts: job.attemptsMade,
        persistentDeliveryReset,
      },
    );

    return {
      queueName: name,
      jobId: job.id ?? jobId,
      jobName: job.name,
      state: 'waiting',
    };
  }

  private async resetPersistentDelivery(
    queueName: QueueName,
    jobName: string,
    data: unknown,
  ): Promise<boolean> {
    if (
      queueName !== QUEUE_NAMES.notificationDelivery ||
      jobName !== 'deliver-email'
    ) {
      return false;
    }
    const deliveryId =
      data && typeof data === 'object' && 'deliveryId' in data
        ? (data as { deliveryId?: unknown }).deliveryId
        : undefined;
    if (typeof deliveryId !== 'string' || !deliveryId) {
      throw new BadRequestException('Job de livraison sans deliveryId valide');
    }

    const result = await this.prisma.notificationDelivery.updateMany({
      where: {
        id: deliveryId,
        status: NotificationDeliveryStatus.FAILED,
      },
      data: {
        status: NotificationDeliveryStatus.FAILED,
        attemptCount: 0,
        nextAttemptAt: null,
        updatedAt: new Date(),
      },
    });
    if (result.count === 0) {
      throw new BadRequestException(
        "La livraison persistée n'est pas rejouable",
      );
    }
    return true;
  }

  private async getQueueSnapshot(name: QueueName) {
    const queue = this.queues.queue(name);
    const [counts, oldestWaitingJobs, failedJobs] = await Promise.all([
      queue.getJobCounts(
        'waiting',
        'active',
        'delayed',
        'failed',
        'completed',
        'paused',
      ),
      queue.getJobs(['waiting'], 0, 0, true),
      queue.getJobs(['failed'], 0, 49, false),
    ]);
    const now = Date.now();
    const oldestWaitingAgeMs = oldestWaitingJobs[0]
      ? Math.max(0, now - oldestWaitingJobs[0].timestamp)
      : 0;
    const recentFailures = failedJobs.filter(
      (job) => (job.finishedOn ?? job.timestamp) >= now - 60 * 60_000,
    ).length;

    return {
      name,
      health: this.queueHealth(
        counts.waiting,
        oldestWaitingAgeMs,
        recentFailures,
      ),
      counts,
      oldestWaitingAgeMs,
      recentFailuresLastHour: recentFailures,
    };
  }

  private parseQueueName(value: string): QueueName {
    const names = Object.values(QUEUE_NAMES) as QueueName[];
    if (!names.includes(value as QueueName)) {
      throw new BadRequestException('File BullMQ inconnue');
    }
    return value as QueueName;
  }

  private queueHealth(
    waiting: number,
    oldestWaitingAgeMs: number,
    recentFailures: number,
  ): QueueHealth {
    const thresholds = this.thresholds();
    if (
      waiting >= thresholds.criticalBacklog ||
      oldestWaitingAgeMs >= thresholds.criticalLagMs ||
      recentFailures >= thresholds.criticalFailuresPerHour
    ) {
      return 'critical';
    }
    if (
      waiting >= thresholds.warningBacklog ||
      oldestWaitingAgeMs >= thresholds.warningLagMs ||
      recentFailures >= thresholds.warningFailuresPerHour
    ) {
      return 'degraded';
    }
    return 'healthy';
  }

  private thresholds() {
    return {
      warningBacklog: this.positiveInteger('QUEUE_WARNING_BACKLOG', 100),
      criticalBacklog: this.positiveInteger('QUEUE_CRITICAL_BACKLOG', 1_000),
      warningLagMs: this.positiveInteger('QUEUE_WARNING_LAG_MS', 5 * 60_000),
      criticalLagMs: this.positiveInteger('QUEUE_CRITICAL_LAG_MS', 30 * 60_000),
      warningFailuresPerHour: this.positiveInteger(
        'QUEUE_WARNING_FAILURES_PER_HOUR',
        5,
      ),
      criticalFailuresPerHour: this.positiveInteger(
        'QUEUE_CRITICAL_FAILURES_PER_HOUR',
        20,
      ),
    };
  }

  private positiveInteger(key: string, fallback: number): number {
    const value = Number(this.config.get<string>(key));
    return Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback;
  }

  private worstHealth(left: QueueHealth, right: QueueHealth): QueueHealth {
    const rank: Record<QueueHealth, number> = {
      healthy: 0,
      degraded: 1,
      critical: 2,
    };
    return rank[right] > rank[left] ? right : left;
  }
}
