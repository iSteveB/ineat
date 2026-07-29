import { validateEnvironment } from './env.validation';
import { STRIPE_PRICE_CATALOG, STRIPE_PRODUCT_NAME } from './stripe';

describe('validateEnvironment', () => {
  const validStripeEnvironment = {
    NODE_ENV: 'production',
    REDIS_URL: 'redis://redis.railway.internal:6379',
    RESEND_API_KEY: 're_test_123',
    EMAIL_FROM: 'InEat <bonjour@ineat.store>',
    EMAIL_REPLY_TO: 'support@ineat.store',
    STRIPE_SECRET_KEY: 'sk_test_123',
    STRIPE_PRICE_PREMIUM_MONTHLY_EUR: 'price_monthly_123',
    STRIPE_PRICE_PREMIUM_YEARLY_EUR: 'price_yearly_123',
    STRIPE_WEBHOOK_SECRET: 'whsec_123',
    STRIPE_CHECKOUT_SUCCESS_URL: 'https://ineat.store/subscription/success',
    STRIPE_CHECKOUT_CANCEL_URL: 'https://ineat.store/subscription',
    STRIPE_CUSTOMER_PORTAL_RETURN_URL: 'https://ineat.store/subscription',
  };

  it('allows local development without Stripe values', () => {
    expect(validateEnvironment({ NODE_ENV: 'development' })).toMatchObject({
      NODE_ENV: 'development',
      STRIPE_ENABLED: false,
      NOTIFICATION_RETENTION_DAYS: 180,
      NOTIFICATION_SCHEDULER_MODE: 'legacy',
      NOTIFICATION_DELIVERY_MODE: 'legacy',
    });
  });

  it('requires complete Stripe configuration in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        REDIS_URL: 'redis://redis.railway.internal:6379',
        RESEND_API_KEY: 're_test_123',
        EMAIL_FROM: 'InEat <bonjour@ineat.store>',
        EMAIL_REPLY_TO: 'support@ineat.store',
      }),
    ).toThrow(/STRIPE_SECRET_KEY/);
  });

  it('requires complete email configuration in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        REDIS_URL: 'redis://redis.railway.internal:6379',
      }),
    ).toThrow(/RESEND_API_KEY/);
  });

  it('rejects partially configured email environments', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'development',
        RESEND_API_KEY: 're_test_123',
      }),
    ).toThrow(/EMAIL_FROM/);
  });

  it('rejects partially configured Stripe environments', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'development',
        STRIPE_SECRET_KEY: 'sk_test_123',
      }),
    ).toThrow(/STRIPE_PRICE_PREMIUM_MONTHLY_EUR/);
  });

  it('accepts a complete Stripe environment', () => {
    expect(validateEnvironment(validStripeEnvironment)).toMatchObject(
      validStripeEnvironment,
    );
  });

  it('requires Redis in production', () => {
    const { REDIS_URL: _redisUrl, ...withoutRedis } = validStripeEnvironment;

    expect(() => validateEnvironment(withoutRedis)).toThrow(/REDIS_URL/);
  });

  it('rejects an unknown notification scheduler mode', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'development',
        NOTIFICATION_SCHEDULER_MODE: 'both',
      }),
    ).toThrow(/NOTIFICATION_SCHEDULER_MODE/);
  });

  it('rejects an unknown notification delivery mode', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'development',
        NOTIFICATION_DELIVERY_MODE: 'sync-and-queue',
      }),
    ).toThrow(/NOTIFICATION_DELIVERY_MODE/);
  });
});

describe('Stripe V1 catalog', () => {
  it('keeps the documented product and catalog prices in cents', () => {
    expect(STRIPE_PRODUCT_NAME).toBe('InEat Premium');
    expect(STRIPE_PRICE_CATALOG).toEqual({
      premiumMonthlyEur: {
        lookupKey: 'premium_monthly_eur',
        amount: 599,
        currency: 'eur',
        interval: 'month',
      },
      premiumYearlyEur: {
        lookupKey: 'premium_yearly_eur',
        amount: 5999,
        currency: 'eur',
        interval: 'year',
      },
    });
  });
});
