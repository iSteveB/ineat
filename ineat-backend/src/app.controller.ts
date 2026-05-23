import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AppService } from './app.service';
import { Response } from 'express';
import { ReceiptProcessingJobData } from './receipt/processors/receipt.processor';
import * as Sentry from '@sentry/nestjs';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectQueue('receipt-processing')
    private readonly receiptQueue: Queue<ReceiptProcessingJobData>,
  ) {}

  @Get('health/redis')
  async redisHealthCheck(@Res() res: Response): Promise<void> {
    try {
      // Tester la connexion Redis via la queue
      await this.receiptQueue.isReady();

      // Récupérer quelques statistiques
      const [waiting, active, completed, failed] = await Promise.all([
        this.receiptQueue.getWaiting(),
        this.receiptQueue.getActive(),
        this.receiptQueue.getCompleted(),
        this.receiptQueue.getFailed(),
      ]);

      res.status(HttpStatus.OK).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        redis: {
          connected: true,
          queue: 'receipt-processing',
          stats: {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
          },
        },
      });
    } catch (error) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        redis: {
          connected: false,
          error: error.message,
        },
      });
    }
  }

  @Get('health')
  healthCheck(@Res() res: Response): void {
    res.status(HttpStatus.OK).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'ineat-backend',
      version: '1.0.0',
    });
  }

  @Get('debug-sentry')
  debugSentry(): never {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException('Route non trouvée');
    }

    Sentry.logger.info('User triggered test error', {
      action: 'test_error_endpoint',
    });
    Sentry.metrics.count('test_counter', 1);
    throw new Error('Sentry debug endpoint test error');
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
