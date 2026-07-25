import { ConfigService } from '@nestjs/config';
import { BillingService } from './billing.service';
import { BillingInterval } from './dto/create-checkout-session.dto';
import { StripeClientFactory } from './stripe-client.factory';

describe('BillingService', () => {
  const user = {
    id: 'user-1',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
  };

  const createStripeMock = () => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_new' }),
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/c/pay/cs_test_123',
        }),
      },
    },
    billingPortal: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'bps_test_123',
          url: 'https://billing.stripe.com/p/session/bps_test_123',
        }),
      },
    },
    subscriptions: {
      retrieve: jest.fn().mockResolvedValue({
        id: 'sub_123',
        customer: 'cus_existing',
        status: 'active',
        cancel_at_period_end: false,
        canceled_at: null,
        current_period_start: 1782864000,
        current_period_end: 1785542400,
        metadata: { userId: user.id },
        items: {
          data: [{ price: { id: 'price_monthly' } }],
        },
      }),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  });

  const createConfigService = () =>
    ({
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          STRIPE_PRICE_PREMIUM_MONTHLY_EUR: 'price_monthly',
          STRIPE_PRICE_PREMIUM_YEARLY_EUR: 'price_yearly',
          STRIPE_WEBHOOK_SECRET: 'whsec_test',
          STRIPE_CHECKOUT_SUCCESS_URL:
            'https://ineat.store/app/subscription/success',
          STRIPE_CHECKOUT_CANCEL_URL: 'https://ineat.store/app/subscription',
          STRIPE_CUSTOMER_PORTAL_RETURN_URL:
            'https://ineat.store/app/subscription',
        };

        return config[key];
      }),
    }) as unknown as ConfigService;

  const createService = (persistedUser: Record<string, unknown>) => {
    const stripe = createStripeMock();
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(persistedUser),
        update: jest.fn().mockResolvedValue({
          ...persistedUser,
          stripeCustomerId: 'cus_new',
        }),
      },
      stripeWebhookEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const stripeClientFactory = {
      getClient: jest.fn().mockReturnValue(stripe),
    } as unknown as StripeClientFactory;

    const service = new BillingService(
      prisma as never,
      createConfigService(),
      stripeClientFactory,
    );

    return { service, prisma, stripe };
  };

  it('creates a monthly Checkout session with the backend monthly price', async () => {
    const { service, prisma, stripe } = createService({
      ...user,
      stripeCustomerId: null,
    });

    const session = await service.createCheckoutSession(
      user,
      BillingInterval.MONTHLY,
    );

    expect(stripe.customers.create).toHaveBeenCalledWith({
      email: user.email,
      name: 'Jane Doe',
      metadata: { userId: user.id },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { stripeCustomerId: 'cus_new' },
    });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        customer: 'cus_new',
        line_items: [{ price: 'price_monthly', quantity: 1 }],
        success_url: 'https://ineat.store/app/subscription/success',
        cancel_url: 'https://ineat.store/app/subscription',
        client_reference_id: user.id,
      }),
    );
    expect(session).toEqual({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
    });
  });

  it('creates a yearly Checkout session with the backend yearly price', async () => {
    const { service, stripe } = createService({
      ...user,
      stripeCustomerId: 'cus_existing',
    });

    await service.createCheckoutSession(user, BillingInterval.YEARLY);

    expect(stripe.customers.create).not.toHaveBeenCalled();
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_existing',
        line_items: [{ price: 'price_yearly', quantity: 1 }],
      }),
    );
  });

  it('creates a Customer Portal session for an existing Stripe customer', async () => {
    const { service, stripe } = createService({
      ...user,
      stripeCustomerId: 'cus_existing',
    });

    const session = await service.createPortalSession(user);

    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: 'cus_existing',
      return_url: 'https://ineat.store/app/subscription',
    });
    expect(session).toEqual({
      id: 'bps_test_123',
      url: 'https://billing.stripe.com/p/session/bps_test_123',
    });
  });

  it('rejects Customer Portal creation when the user has no Stripe customer', async () => {
    const { service, stripe } = createService({
      ...user,
      stripeCustomerId: null,
    });

    await expect(service.createPortalSession(user)).rejects.toThrow(
      "Aucun abonnement Stripe n'est encore associé à votre compte.",
    );
    expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
  });

  it('does not activate Premium from Checkout creation', async () => {
    const { service, prisma } = createService({
      ...user,
      stripeCustomerId: null,
      subscriptionPlan: 'FREE',
      subscriptionStatus: 'ACTIVE',
    });

    await service.createCheckoutSession(user, BillingInterval.MONTHLY);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { stripeCustomerId: 'cus_new' },
    });
    expect(prisma.user.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subscriptionPlan: 'PREMIUM',
        }),
      }),
    );
  });

  it('activates Premium from a signed checkout.session.completed webhook', async () => {
    const { service, prisma, stripe } = createService({
      ...user,
      stripeCustomerId: 'cus_existing',
    });
    stripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_checkout',
      type: 'checkout.session.completed',
      created: 1782864000,
      data: {
        object: {
          customer: 'cus_existing',
          subscription: 'sub_123',
          client_reference_id: user.id,
          metadata: { userId: user.id },
        },
      },
    });

    await expect(
      service.handleWebhook('sig_test', Buffer.from('{}')),
    ).resolves.toEqual({ received: true, duplicate: false });

    expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
      Buffer.from('{}'),
      'sig_test',
      'whsec_test',
    );
    expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_123');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: expect.objectContaining({
        stripeCustomerId: 'cus_existing',
        stripeSubscriptionId: 'sub_123',
        stripePriceId: 'price_monthly',
        billingInterval: 'MONTHLY',
        subscriptionPlan: 'PREMIUM',
        subscriptionStatus: 'ACTIVE',
        cancelAtPeriodEnd: false,
      }),
    });
    expect(prisma.stripeWebhookEvent.update).toHaveBeenLastCalledWith({
      where: { stripeEventId: 'evt_checkout' },
      data: expect.objectContaining({ status: 'PROCESSED' }),
    });
  });

  it('keeps Premium cancelled until period end when Stripe schedules cancellation', async () => {
    const { service, prisma, stripe } = createService({
      ...user,
      stripeCustomerId: 'cus_existing',
      stripeSubscriptionId: 'sub_123',
    });
    stripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_subscription_updated',
      type: 'customer.subscription.updated',
      created: 1782864000,
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_existing',
          status: 'active',
          cancel_at_period_end: true,
          canceled_at: null,
          current_period_start: 1782864000,
          current_period_end: 1785542400,
          metadata: { userId: user.id },
          items: {
            data: [{ price: { id: 'price_yearly' } }],
          },
        },
      },
    });

    await service.handleWebhook('sig_test', Buffer.from('{}'));

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: expect.objectContaining({
        billingInterval: 'YEARLY',
        subscriptionStatus: 'CANCELLED',
        cancelAtPeriodEnd: true,
        currentPeriodEndsAt: new Date('2026-08-01T00:00:00.000Z'),
      }),
    });
  });

  it('marks Premium expired when the subscription is deleted', async () => {
    const { service, prisma, stripe } = createService({
      ...user,
      stripeCustomerId: 'cus_existing',
      stripeSubscriptionId: 'sub_123',
    });
    stripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_subscription_deleted',
      type: 'customer.subscription.deleted',
      created: 1782864000,
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_existing',
          status: 'canceled',
          cancel_at_period_end: false,
          canceled_at: 1782864000,
          current_period_start: 1780272000,
          current_period_end: 1782864000,
          metadata: { userId: user.id },
          items: {
            data: [{ price: { id: 'price_monthly' } }],
          },
        },
      },
    });

    await service.handleWebhook('sig_test', Buffer.from('{}'));

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: expect.objectContaining({
        subscriptionPlan: 'PREMIUM',
        subscriptionStatus: 'EXPIRED',
        cancelAtPeriodEnd: false,
        subscriptionCancelledAt: new Date('2026-07-01T00:00:00.000Z'),
      }),
    });
  });

  it('does not cut Premium access on invoice.payment_failed', async () => {
    const { service, prisma, stripe } = createService({
      ...user,
      stripeCustomerId: 'cus_existing',
      stripeSubscriptionId: 'sub_123',
    });
    stripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_invoice_failed',
      type: 'invoice.payment_failed',
      created: 1782864000,
      data: {
        object: {
          customer: 'cus_existing',
          subscription: 'sub_123',
        },
      },
    });

    await service.handleWebhook('sig_test', Buffer.from('{}'));

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: {
        lastStripeEventAt: new Date('2026-07-01T00:00:00.000Z'),
      },
    });
  });

  it('ignores already processed webhook events', async () => {
    const { service, prisma, stripe } = createService({
      ...user,
      stripeCustomerId: 'cus_existing',
    });
    prisma.stripeWebhookEvent.findUnique.mockResolvedValue({
      stripeEventId: 'evt_duplicate',
      status: 'PROCESSED',
    });
    stripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_duplicate',
      type: 'checkout.session.completed',
      created: 1782864000,
      data: { object: {} },
    });

    await expect(
      service.handleWebhook('sig_test', Buffer.from('{}')),
    ).resolves.toEqual({ received: true, duplicate: true });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('rejects invalid Stripe signatures', async () => {
    const { service, stripe } = createService({
      ...user,
      stripeCustomerId: 'cus_existing',
    });
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });

    await expect(
      service.handleWebhook('sig_test', Buffer.from('{}')),
    ).rejects.toThrow('Signature Stripe invalide');
  });
});
