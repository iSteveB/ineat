import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum BillingInterval {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export class CreateCheckoutSessionDto {
  @ApiProperty({
    enum: BillingInterval,
    example: BillingInterval.MONTHLY,
    description: 'Intervalle de facturation Premium demandé.',
  })
  @IsEnum(BillingInterval)
  interval: BillingInterval;
}

export class CheckoutSessionResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({
    example: {
      id: 'cs_test_...',
      url: 'https://checkout.stripe.com/c/pay/cs_test_...',
    },
  })
  data: {
    id: string;
    url: string;
  };
}

export class PortalSessionResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({
    example: {
      id: 'bps_test_...',
      url: 'https://billing.stripe.com/p/session/...',
    },
  })
  data: {
    id: string;
    url: string;
  };
}

export class TrialStartResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({
    example: {
      trialStartedAt: '2026-07-26T07:00:00.000Z',
      trialEndsAt: '2026-07-29T07:00:00.000Z',
    },
  })
  data: {
    trialStartedAt: string;
    trialEndsAt: string;
  };
}
