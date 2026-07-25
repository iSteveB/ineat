import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { BillingService } from './billing.service';
import {
  CheckoutSessionResponseDto,
  CreateCheckoutSessionDto,
} from './dto/create-checkout-session.dto';

interface AuthenticatedBillingRequest extends Request {
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
}

interface StripeWebhookRequest extends Request {
  rawBody?: Buffer;
}

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(SessionAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer une session Stripe Checkout Premium',
    description:
      'Crée une session Checkout pour un achat Premium explicite. Le trial gratuit InEat ne passe pas par Stripe.',
  })
  @ApiBody({ type: CreateCheckoutSessionDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Session Checkout créée',
    type: CheckoutSessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Intervalle invalide',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentification requise',
  })
  async createCheckoutSession(
    @Req() req: AuthenticatedBillingRequest,
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    const session = await this.billingService.createCheckoutSession(
      req.user,
      dto.interval,
    );

    return {
      success: true,
      data: session,
    };
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recevoir un webhook Stripe signé',
    description:
      "Synchronise le statut Premium depuis les événements Stripe. Cette route utilise la signature Stripe et n'active jamais un statut depuis le frontend.",
  })
  async handleWebhook(
    @Req() req: StripeWebhookRequest,
    @Headers('stripe-signature') signature?: string,
  ) {
    return this.billingService.handleWebhook(signature, req.rawBody);
  }
}
