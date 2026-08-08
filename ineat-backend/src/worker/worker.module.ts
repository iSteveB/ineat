import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from '../config/env.validation';
import { JobsModule } from '../jobs/jobs.module';
import { RedisModule } from '../redis/redis.module';
import { WorkerRuntimeService } from './worker-runtime.service';
import { NotificationProcessingModule } from '../notification/notification-processing.module';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      validate: validateEnvironment,
    }),
    RedisModule,
    JobsModule,
    AuthModule,
    CloudinaryModule,
    InvoiceModule,
    NotificationProcessingModule,
  ],
  providers: [WorkerRuntimeService],
})
export class WorkerModule {}
