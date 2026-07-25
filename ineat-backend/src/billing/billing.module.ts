import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { StripeClientFactory } from './stripe-client.factory';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule],
  controllers: [BillingController],
  providers: [BillingService, StripeClientFactory],
})
export class BillingModule {}
