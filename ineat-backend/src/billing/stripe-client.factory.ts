import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeClientFactory {
  private client?: Stripe;

  constructor(private readonly configService: ConfigService) {}

  getClient(): Stripe {
    if (this.client) {
      return this.client;
    }

    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!secretKey) {
      throw new InternalServerErrorException({
        code: 'STRIPE_NOT_CONFIGURED',
        message: 'La facturation Stripe est indisponible pour le moment.',
      });
    }

    this.client = new Stripe(secretKey);
    return this.client;
  }
}
