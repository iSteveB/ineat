import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { ResendWebhookController } from './resend-webhook.controller';
import { ResendWebhookService } from './resend-webhook.service';

@Global()
@Module({
  controllers: [ResendWebhookController],
  providers: [EmailService, ResendWebhookService],
  exports: [EmailService],
})
export class EmailModule {}
