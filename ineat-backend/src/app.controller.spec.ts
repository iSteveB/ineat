import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { NotFoundException } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: getQueueToken('receipt-processing'),
          useValue: {},
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('debugSentry', () => {
    it('should be hidden in production', () => {
      process.env.NODE_ENV = 'production';

      expect(() => appController.debugSentry()).toThrow(NotFoundException);
    });
  });
});
