import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Queue, type JobsOptions, type RepeatOptions } from 'bullmq';
import { QUEUE_NAMES, type QueueName } from '../redis/redis.constants';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2_000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 1_000 },
  removeOnFail: { age: 7 * 24 * 60 * 60, count: 5_000 },
};

@Injectable()
export class QueueService implements OnApplicationShutdown {
  private readonly queues = new Map<QueueName, Queue>();

  constructor(redis: RedisService, config: ConfigService) {
    const prefix =
      config.get<string>('REDIS_KEY_PREFIX')?.trim() ||
      `ineat:${config.get<string>('NODE_ENV', 'development')}`;
    for (const name of Object.values(QUEUE_NAMES)) {
      this.queues.set(
        name,
        new Queue(name, {
          connection: redis.producerConnection(),
          prefix,
          defaultJobOptions: DEFAULT_JOB_OPTIONS,
        }),
      );
    }
  }

  queue(name: QueueName): Queue {
    const queue = this.queues.get(name);
    if (!queue) throw new Error(`Unknown queue: ${name}`);
    return queue;
  }

  async add<T>(
    queueName: QueueName,
    jobName: string,
    data: T,
    options: JobsOptions = {},
  ) {
    return this.queue(queueName).add(jobName, data, options);
  }

  async addBulk<T>(
    queueName: QueueName,
    jobs: Array<{
      name: string;
      data: T;
      opts?: JobsOptions;
    }>,
  ) {
    if (jobs.length === 0) return [];
    return this.queue(queueName).addBulk(jobs);
  }

  async upsertScheduler<T>(
    queueName: QueueName,
    schedulerId: string,
    repeat: Omit<RepeatOptions, 'key'>,
    job: { name: string; data: T; opts?: JobsOptions },
  ) {
    return this.queue(queueName).upsertJobScheduler(schedulerId, repeat, job);
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
  }
}
