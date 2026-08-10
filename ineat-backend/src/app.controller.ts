import { Controller, Get, HttpStatus, Res, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';
import { ObservabilityService } from './observability/observability.service';
import { SessionAuthGuard } from './auth/guards/session-auth.guard';
import { RoleGuard } from './auth/guards/role.guard';
import { RequiresRole } from './auth/decorators/requires-role.decorator';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly observabilityService: ObservabilityService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  @Get('health')
  async healthCheck(@Res() res: Response): Promise<void> {
    const checks = {
      database: false,
      redis: false,
    };

    try {
      await this.prismaService.$queryRawUnsafe('SELECT 1');
      checks.database = true;
    } catch {
      checks.database = false;
    }

    checks.redis = await this.redisService.ping();

    // Redis-backed jobs degrade independently; database availability remains
    // the liveness condition for the HTTP API.
    const isHealthy = checks.database;

    res
      .status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json({
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

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
