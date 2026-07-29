import './instrument';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker/worker.module';

async function bootstrap(): Promise<void> {
  process.env.INEAT_PROCESS_ROLE = 'worker';
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  Logger.log('InEat background worker started', 'WorkerBootstrap');
}

bootstrap().catch((error) => {
  Logger.error('Failed to start background worker', error, 'WorkerBootstrap');
  process.exit(1);
});
