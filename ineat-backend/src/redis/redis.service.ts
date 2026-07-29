import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_PRODUCER, REDIS_WORKER } from './redis.constants';

@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);

  constructor(
    @Inject(REDIS_PRODUCER) private readonly producer: Redis,
    @Inject(REDIS_WORKER) private readonly worker: Redis,
  ) {}

  producerConnection(): Redis {
    return this.producer;
  }

  workerConnection(): Redis {
    return this.worker;
  }

  async ping(): Promise<boolean> {
    try {
      if (this.producer.status === 'wait') {
        await this.producer.connect();
      }
      return (await this.producer.ping()) === 'PONG';
    } catch (error) {
      this.logger.warn(
        `Redis health check failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return false;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all([this.close(this.producer), this.close(this.worker)]);
  }

  private async close(connection: Redis): Promise<void> {
    if (connection.status === 'end') return;

    try {
      await connection.quit();
    } catch {
      connection.disconnect(false);
    }
  }
}
