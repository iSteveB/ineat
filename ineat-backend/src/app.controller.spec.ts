import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ObservabilityService } from './observability/observability.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ObservabilityService,
          useValue: {
            getSnapshot: jest.fn(),
          },
        },
        {
          provide: getQueueToken('receipt-processing'),
          useValue: {
            isReady: jest.fn(),
            getWaiting: jest.fn(),
            getActive: jest.fn(),
            getCompleted: jest.fn(),
            getFailed: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
