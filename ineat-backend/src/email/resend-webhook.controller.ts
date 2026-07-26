import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ResendWebhookService } from './resend-webhook.service';

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller('email')
export class ResendWebhookController {
  constructor(private readonly webhooks: ResendWebhookService) {}

  @Post('webhook')
  process(
    @Req() request: RawBodyRequest,
    @Headers('svix-id') id?: string,
    @Headers('svix-timestamp') timestamp?: string,
    @Headers('svix-signature') signature?: string,
  ) {
    if (!request.rawBody || !id || !timestamp || !signature) {
      throw new BadRequestException('Missing Resend webhook signature');
    }

    return this.webhooks.process(request.rawBody.toString('utf8'), {
      id,
      timestamp,
      signature,
    });
  }
}
