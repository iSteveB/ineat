import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';
import { ObservabilityService } from './observability/observability.service';
import { SessionAuthGuard } from './auth/guards/session-auth.guard';
import { RoleGuard } from './auth/guards/role.guard';
import { RequiresRole } from './auth/decorators/requires-role.decorator';
import { PrismaService } from './prisma/prisma.service';
import * as Sentry from '@sentry/nestjs';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly observabilityService: ObservabilityService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get('health')
  async healthCheck(@Res() res: Response): Promise<void> {
    const checks = {
      database: false,
    };

    try {
      await this.prismaService.$queryRawUnsafe('SELECT 1');
      checks.database = true;
    } catch {
      checks.database = false;
    }

    const isHealthy = checks.database;

    res.status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      service: 'ineat-backend',
      version: '1.0.0',
      checks,
    });
  }

  @Get('health/observability')
  @RequiresRole('ADMIN')
  @UseGuards(SessionAuthGuard, RoleGuard)
  observabilitySnapshot() {
    return {
      status: 'ok',
      ...this.observabilityService.getSnapshot(),
    };
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
