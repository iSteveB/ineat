import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { RoleGuard } from '../src/auth/guards/role.guard';
import { SessionAuthGuard } from '../src/auth/guards/session-auth.guard';
import { ObservabilityService } from '../src/observability/observability.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';

describe('Application health (e2e)', () => {
  let app: INestApplication;
  const prisma = { $queryRawUnsafe: jest.fn() };
  const redis = { ping: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: ObservabilityService, useValue: { getSnapshot: jest.fn() } },
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    })
      .overrideGuard(SessionAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$queryRawUnsafe.mockResolvedValue([{ '?column?': 1 }]);
    redis.ping.mockResolvedValue(true);
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports the API and its dependencies as healthy', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'ineat-backend',
      version: '1.0.0',
      checks: { database: true, redis: true },
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  it('keeps the API live when Redis is unavailable', async () => {
    redis.ping.mockResolvedValue(false);

    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 'ok',
          checks: { database: true, redis: false },
        });
      });
  });

  it('reports an unavailable API when PostgreSQL is down', async () => {
    prisma.$queryRawUnsafe.mockRejectedValue(new Error('database unavailable'));

    await request(app.getHttpServer())
      .get('/health')
      .expect(503)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 'error',
          checks: { database: false, redis: true },
        });
      });
  });
});
