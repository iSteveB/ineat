export const STRIPE_PRODUCT_NAME = 'InEat Premium';

export const STRIPE_PRICE_CATALOG = {
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
} as const;

export const STRIPE_REQUIRED_ENV_KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PRICE_PREMIUM_MONTHLY_EUR',
  'STRIPE_PRICE_PREMIUM_YEARLY_EUR',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_CHECKOUT_SUCCESS_URL',
  'STRIPE_CHECKOUT_CANCEL_URL',
  'STRIPE_CUSTOMER_PORTAL_RETURN_URL',
] as const;

export type StripeRequiredEnvKey = (typeof STRIPE_REQUIRED_ENV_KEYS)[number];
