import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { randomUUID } from 'crypto';
import {
  BillingInterval as PrismaBillingInterval,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../prisma/generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { BillingInterval } from './dto/create-checkout-session.dto';
import { StripeClientFactory } from './stripe-client.factory';
import { TrialEmailService } from './trial-email.service';

type CheckoutUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly stripeClientFactory: StripeClientFactory,
    @Optional() private readonly trialEmails?: TrialEmailService,
    @Optional() private readonly email?: EmailService,
  ) {}

  async createCheckoutSession(user: CheckoutUser, interval: BillingInterval) {
    const stripe = this.stripeClientFactory.getClient();
    const customerId = await this.getOrCreateStripeCustomer(stripe, user);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: this.getPriceId(interval),
          quantity: 1,
        },
      ],
      success_url: this.getRequiredConfig('STRIPE_CHECKOUT_SUCCESS_URL'),
      cancel_url: this.getRequiredConfig('STRIPE_CHECKOUT_CANCEL_URL'),
      client_reference_id: user.id,
      subscription_data: {
        metadata: {
          userId: user.id,
          billingInterval: interval,
        },
      },
      metadata: {
        userId: user.id,
        billingInterval: interval,
      },
    });

    if (!session.url) {
      throw new InternalServerErrorException({
        code: 'STRIPE_CHECKOUT_URL_MISSING',
        message: 'Impossible de créer la session de paiement.',
      });
    }

    return {
      id: session.id,
      url: session.url,
    };
  }

  async createPortalSession(user: CheckoutUser) {
    const stripe = this.stripeClientFactory.getClient();
    const persistedUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { stripeCustomerId: true },
    });

    if (!persistedUser) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (!persistedUser.stripeCustomerId) {
      throw new BadRequestException({
        code: 'STRIPE_CUSTOMER_MISSING',
        message: "Aucun abonnement Stripe n'est encore associé à votre compte.",
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: persistedUser.stripeCustomerId,
      return_url: this.getRequiredConfig('STRIPE_CUSTOMER_PORTAL_RETURN_URL'),
    });

    if (!session.url) {
      throw new InternalServerErrorException({
        code: 'STRIPE_PORTAL_URL_MISSING',
        message: "Impossible d'ouvrir la gestion de l'abonnement.",
      });
    }

    return {
      id: session.id,
      url: session.url,
    };
  }

  async startTrial(user: CheckoutUser, now = new Date()) {
    const persistedUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        trialUsedAt: true,
        currentPeriodEndsAt: true,
      },
    });

    if (!persistedUser) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (persistedUser.trialUsedAt) {
      throw new BadRequestException({
        code: 'TRIAL_ALREADY_USED',
        message: "L'essai gratuit a déjà été utilisé.",
      });
    }

    if (
      persistedUser.subscriptionPlan === SubscriptionPlan.PREMIUM &&
      (persistedUser.subscriptionStatus === SubscriptionStatus.ACTIVE ||
        (persistedUser.subscriptionStatus === SubscriptionStatus.CANCELLED &&
          persistedUser.currentPeriodEndsAt &&
          persistedUser.currentPeriodEndsAt.getTime() > now.getTime()))
    ) {
      throw new BadRequestException({
        code: 'PREMIUM_ALREADY_ACTIVE',
        message: 'Premium est déjà actif sur votre compte.',
      });
    }

    if (persistedUser.subscriptionPlan !== SubscriptionPlan.FREE) {
      throw new BadRequestException({
        code: 'TRIAL_NOT_AVAILABLE',
        message: "L'essai gratuit n'est pas disponible pour ce compte.",
      });
    }

    const trialStartedAt = now;
    const trialEndsAt = new Date(trialStartedAt);
    trialEndsAt.setDate(trialEndsAt.getDate() + 3);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionPlan: SubscriptionPlan.TRIAL,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        trialStartedAt,
        trialEndsAt,
        trialUsedAt: trialStartedAt,
        currentPeriodStartedAt: trialStartedAt,
        currentPeriodEndsAt: trialEndsAt,
        billingInterval: null,
        cancelAtPeriodEnd: false,
      },
    });

    await this.trialEmails?.sendTrialStarted(user.id).catch((error) => {
      this.logger.error(
        `Trial started email failed for user ${user.id}`,
        error,
      );
    });

    return {
      trialStartedAt: trialStartedAt.toISOString(),
      trialEndsAt: trialEndsAt.toISOString(),
    };
  }

  async handleWebhook(signature?: string, rawBody?: Buffer) {
    if (!signature || !rawBody) {
      throw new BadRequestException('Webhook Stripe invalide');
    }

    const stripe = this.stripeClientFactory.getClient();
    const webhookSecret = this.getRequiredConfig('STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Signature Stripe invalide');
    }

    const existingEvent = await this.prisma.stripeWebhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });

    if (existingEvent?.status === 'PROCESSED') {
      return { received: true, duplicate: true };
    }

    if (!existingEvent) {
      await this.prisma.stripeWebhookEvent.create({
        data: {
          id: randomUUID(),
          stripeEventId: event.id,
          type: event.type,
          status: 'PROCESSING',
        },
      });
    } else {
      await this.prisma.stripeWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: {
          status: 'PROCESSING',
          errorMessage: null,
        },
      });
    }

    try {
      await this.processWebhookEvent(stripe, event);
      await this.prisma.stripeWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
          errorMessage: null,
        },
      });

      return { received: true, duplicate: false };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Stripe webhook error';

      await this.prisma.stripeWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: {
          status: 'FAILED',
          errorMessage: message,
        },
      });

      this.logger.error(`Stripe webhook ${event.id} failed: ${message}`);
      throw error;
    }
  }

  private async getOrCreateStripeCustomer(
    stripe: Stripe,
    user: CheckoutUser,
  ): Promise<string> {
    const persistedUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        stripeCustomerId: true,
      },
    });

    if (!persistedUser) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (persistedUser.stripeCustomerId) {
      return persistedUser.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
      email: persistedUser.email,
      name: this.formatCustomerName(
        persistedUser.firstName,
        persistedUser.lastName,
      ),
      metadata: {
        userId: persistedUser.id,
      },
    });

    await this.prisma.user.update({
      where: { id: persistedUser.id },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  private getPriceId(interval: BillingInterval): string {
    switch (interval) {
      case BillingInterval.MONTHLY:
        return this.getRequiredConfig('STRIPE_PRICE_PREMIUM_MONTHLY_EUR');
      case BillingInterval.YEARLY:
        return this.getRequiredConfig('STRIPE_PRICE_PREMIUM_YEARLY_EUR');
      default:
        throw new BadRequestException({
          code: 'INVALID_BILLING_INTERVAL',
          message: 'Intervalle de facturation invalide.',
        });
    }
  }

  private async processWebhookEvent(stripe: Stripe, event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(
          stripe,
          event.data.object as Stripe.Checkout.Session,
          event,
        );
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.syncSubscription(
          event.data.object as Stripe.Subscription,
          event,
        );
        break;
      case 'customer.subscription.deleted':
        await this.syncSubscription(
          event.data.object as Stripe.Subscription,
          event,
          true,
        );
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(
          stripe,
          event.data.object as Stripe.Invoice,
          event,
        );
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
          event,
        );
        break;
      default:
        this.logger.debug(`Stripe webhook ${event.type} ignored`);
    }
  }

  private async handleCheckoutCompleted(
    stripe: Stripe,
    session: Stripe.Checkout.Session,
    event: Stripe.Event,
  ) {
    const customerId = this.getStringId(session.customer);
    const subscriptionId = this.getStringId(session.subscription);
    const userId = session.metadata?.userId ?? session.client_reference_id;

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await this.syncSubscription(subscription, event, false, userId);
      await this.sendBillingEventEmail(
        userId,
        customerId,
        subscriptionId,
        event,
        'activated',
        undefined,
        this.getBillingIntervalForPrice(subscription.items.data[0]?.price?.id),
      );
      return;
    }

    if (!userId && !customerId) {
      return;
    }

    await this.updateBillingUser(userId, customerId, undefined, {
      stripeCustomerId: customerId,
      subscriptionPlan: SubscriptionPlan.PREMIUM,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      lastStripeEventAt: this.eventDate(event),
    });
  }

  private async handleInvoicePaymentSucceeded(
    stripe: Stripe,
    invoice: Stripe.Invoice,
    event: Stripe.Event,
  ) {
    const subscriptionId = this.extractInvoiceSubscriptionId(invoice);

    if (!subscriptionId) {
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await this.syncSubscription(subscription, event);
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
    event: Stripe.Event,
  ) {
    const customerId = this.getStringId(invoice.customer);
    const subscriptionId = this.extractInvoiceSubscriptionId(invoice);

    if (!customerId && !subscriptionId) {
      return;
    }

    const user = await this.updateBillingUser(
      undefined,
      customerId,
      subscriptionId,
      {
        lastStripeEventAt: this.eventDate(event),
      },
    );
    if (user) {
      await this.sendBillingEventEmail(
        user.id,
        customerId,
        subscriptionId,
        event,
        'payment_failed',
      );
    }
  }

  private async syncSubscription(
    subscription: Stripe.Subscription,
    event: Stripe.Event,
    deleted = false,
    fallbackUserId?: string | null,
  ) {
    const customerId = this.getStringId(subscription.customer);
    const subscriptionId = subscription.id;
    const priceId = subscription.items.data[0]?.price?.id;
    const billingInterval = this.getBillingIntervalForPrice(priceId);
    const status = this.getSubscriptionStatus(subscription, deleted);

    const previousUser = await this.updateBillingUser(
      subscription.metadata?.userId ?? fallbackUserId,
      customerId,
      subscriptionId,
      {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        billingInterval,
        subscriptionPlan: SubscriptionPlan.PREMIUM,
        subscriptionStatus: status,
        cancelAtPeriodEnd: deleted
          ? false
          : Boolean(subscription.cancel_at_period_end),
        subscriptionCancelledAt:
          deleted || subscription.canceled_at
            ? (this.fromUnix(subscription.canceled_at) ?? this.eventDate(event))
            : null,
        currentPeriodStartedAt: this.fromUnix(
          (subscription as unknown as { current_period_start?: number })
            .current_period_start,
        ),
        currentPeriodEndsAt: this.fromUnix(
          (subscription as unknown as { current_period_end?: number })
            .current_period_end,
        ),
        lastStripeEventAt: this.eventDate(event),
      },
    );

    if (!previousUser || event.type === 'checkout.session.completed') return;
    if (deleted) {
      await this.sendBillingEventEmail(
        previousUser.id,
        customerId,
        subscriptionId,
        event,
        'expired',
        this.fromUnix(
          (subscription as unknown as { current_period_end?: number })
            .current_period_end,
        ),
        billingInterval,
      );
      return;
    }
    if (
      event.type === 'customer.subscription.updated' &&
      subscription.cancel_at_period_end &&
      !previousUser.cancelAtPeriodEnd
    ) {
      await this.sendBillingEventEmail(
        previousUser.id,
        customerId,
        subscriptionId,
        event,
        'cancelled',
        this.fromUnix(
          (subscription as unknown as { current_period_end?: number })
            .current_period_end,
        ),
        billingInterval,
      );
    } else if (
      event.type === 'customer.subscription.updated' &&
      previousUser.stripePriceId &&
      priceId &&
      previousUser.stripePriceId !== priceId
    ) {
      await this.sendBillingEventEmail(
        previousUser.id,
        customerId,
        subscriptionId,
        event,
        'changed',
        undefined,
        billingInterval,
      );
    }
  }

  private async updateBillingUser(
    userId: string | null | undefined,
    customerId: string | null | undefined,
    subscriptionId: string | null | undefined,
    data: Record<string, unknown>,
  ) {
    const user = await this.findBillingUser(userId, customerId, subscriptionId);

    if (!user) {
      this.logger.warn(
        `Stripe billing user not found for customer=${customerId ?? 'none'} subscription=${subscriptionId ?? 'none'}`,
      );
      return;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data,
    });
    return user;
  }

  private async sendBillingEventEmail(
    userId: string | null | undefined,
    customerId: string | null | undefined,
    subscriptionId: string | null | undefined,
    event: Stripe.Event,
    kind: 'activated' | 'payment_failed' | 'cancelled' | 'expired' | 'changed',
    periodEndsAt?: Date | null,
    billingInterval?: PrismaBillingInterval | null,
  ) {
    if (!this.email) return;
    const user = await this.findBillingUser(userId, customerId, subscriptionId);
    if (!user) return;
    const subscriptionUrl = `${(this.configService.get<string>('FRONTEND_URL') || 'https://ineat.store').replace(/\/$/, '')}/app/subscription`;
    const input = {
      to: user.email,
      userId: user.id,
      eventId: event.id,
      firstName: user.firstName,
      subscriptionUrl,
      periodEndsAt,
      billingInterval,
    };
    if (kind === 'activated') await this.email.sendPremiumActivated(input);
    if (kind === 'payment_failed') await this.email.sendPaymentFailed(input);
    if (kind === 'cancelled')
      await this.email.sendSubscriptionCancelled({
        ...input,
        effective: false,
      });
    if (kind === 'expired')
      await this.email.sendSubscriptionCancelled({ ...input, effective: true });
    if (kind === 'changed') await this.email.sendSubscriptionChanged(input);
  }

  private async findBillingUser(
    userId?: string | null,
    customerId?: string | null,
    subscriptionId?: string | null,
  ) {
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      if (user) {
        return user;
      }
    }

    if (subscriptionId) {
      const user = await this.prisma.user.findUnique({
        where: { stripeSubscriptionId: subscriptionId },
      });

      if (user) {
        return user;
      }
    }

    if (customerId) {
      return this.prisma.user.findUnique({
        where: { stripeCustomerId: customerId },
      });
    }

    return null;
  }

  private getBillingIntervalForPrice(
    priceId?: string,
  ): PrismaBillingInterval | null {
    if (!priceId) {
      return null;
    }

    if (
      priceId === this.getRequiredConfig('STRIPE_PRICE_PREMIUM_MONTHLY_EUR')
    ) {
      return PrismaBillingInterval.MONTHLY;
    }

    if (priceId === this.getRequiredConfig('STRIPE_PRICE_PREMIUM_YEARLY_EUR')) {
      return PrismaBillingInterval.YEARLY;
    }

    return null;
  }

  private getSubscriptionStatus(
    subscription: Stripe.Subscription,
    deleted: boolean,
  ): SubscriptionStatus {
    if (deleted || subscription.status === 'canceled') {
      return SubscriptionStatus.EXPIRED;
    }

    if (subscription.cancel_at_period_end) {
      return SubscriptionStatus.CANCELLED;
    }

    return SubscriptionStatus.ACTIVE;
  }

  private extractInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
    return (
      this.getStringId(
        (invoice as unknown as { subscription?: unknown }).subscription,
      ) ??
      this.getStringId(
        (
          invoice as unknown as {
            parent?: { subscription_details?: { subscription?: unknown } };
          }
        ).parent?.subscription_details?.subscription,
      )
    );
  }

  private getStringId(value: unknown): string | null {
    if (typeof value === 'string') {
      return value;
    }

    if (value && typeof value === 'object' && 'id' in value) {
      const id = (value as { id?: unknown }).id;
      return typeof id === 'string' ? id : null;
    }

    return null;
  }

  private fromUnix(value?: number | null): Date | null {
    return typeof value === 'number' ? new Date(value * 1000) : null;
  }

  private eventDate(event: Stripe.Event): Date {
    return new Date(event.created * 1000);
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new InternalServerErrorException({
        code: 'STRIPE_NOT_CONFIGURED',
        message: 'La facturation Stripe est indisponible pour le moment.',
      });
    }

    return value;
  }

  private formatCustomerName(
    firstName?: string | null,
    lastName?: string | null,
  ) {
    const name = [firstName, lastName].filter(Boolean).join(' ').trim();
    return name.length > 0 ? name : undefined;
  }
}
