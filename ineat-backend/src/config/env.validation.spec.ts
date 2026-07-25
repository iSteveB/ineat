import { validateEnvironment } from './env.validation';
import { STRIPE_PRICE_CATALOG, STRIPE_PRODUCT_NAME } from './stripe';

describe('validateEnvironment', () => {
  const validStripeEnvironment = {
    NODE_ENV: 'production',
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
    });
  });

  it('requires complete Stripe configuration in production', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'production' })).toThrow(
      /STRIPE_SECRET_KEY/,
    );
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
