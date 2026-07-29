import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { REDIS_PRODUCER, REDIS_WORKER } from './redis.constants';
import { RedisService } from './redis.service';

const createConnection = (
  config: ConfigService,
  overrides: RedisOptions = {},
): Redis => {
  const url =
    config.get<string>('REDIS_URL')?.trim() || 'redis://localhost:6379';
  return new Redis(url, {
    connectionName: 'ineat',
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    retryStrategy: (attempt) => Math.min(attempt * 250, 5_000),
    ...overrides,
  });
};

@Global()
@Module({
  providers: [
    {
      provide: REDIS_PRODUCER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createConnection(config),
    },
    {
      provide: REDIS_WORKER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createConnection(config, {
          connectionName: 'ineat-worker',
          enableOfflineQueue: true,
          maxRetriesPerRequest: null,
        }),
    },
    RedisService,
  ],
  exports: [RedisService, REDIS_PRODUCER, REDIS_WORKER],
})
export class RedisModule {}
