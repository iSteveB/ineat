import { z } from 'zod';
import { STRIPE_REQUIRED_ENV_KEYS } from './stripe';

const emptyToUndefined = (value: unknown) => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  return value;
};

const optionalString = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).optional(),
);

const optionalBoolean = z.preprocess((value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return false;
}, z.boolean());

const baseEnvironmentSchema = z
  .object({
    NODE_ENV: z.string().default('development'),
    STRIPE_ENABLED: optionalBoolean,
    STRIPE_SECRET_KEY: optionalString,
    STRIPE_PRICE_PREMIUM_MONTHLY_EUR: optionalString,
    STRIPE_PRICE_PREMIUM_YEARLY_EUR: optionalString,
    STRIPE_WEBHOOK_SECRET: optionalString,
    STRIPE_CHECKOUT_SUCCESS_URL: optionalString,
    STRIPE_CHECKOUT_CANCEL_URL: optionalString,
    STRIPE_CUSTOMER_PORTAL_RETURN_URL: optionalString,
  })
  .passthrough();

const stripeEnvironmentSchema = baseEnvironmentSchema.extend({
  STRIPE_SECRET_KEY: z
    .string()
    .trim()
    .regex(/^sk_(test|live)_/, {
      message: 'must be a Stripe secret key',
    }),
  STRIPE_PRICE_PREMIUM_MONTHLY_EUR: z
    .string()
    .trim()
    .regex(/^price_/, {
      message: 'must be a Stripe Price ID',
    }),
  STRIPE_PRICE_PREMIUM_YEARLY_EUR: z
    .string()
    .trim()
    .regex(/^price_/, {
      message: 'must be a Stripe Price ID',
    }),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .trim()
    .regex(/^whsec_/, {
      message: 'must be a Stripe webhook signing secret',
    }),
  STRIPE_CHECKOUT_SUCCESS_URL: z.string().trim().url(),
  STRIPE_CHECKOUT_CANCEL_URL: z.string().trim().url(),
  STRIPE_CUSTOMER_PORTAL_RETURN_URL: z.string().trim().url(),
});

const formatZodError = (error: z.ZodError) =>
  error.issues
    .map((issue) => `${issue.path.join('.') || 'ENV'}: ${issue.message}`)
    .join('; ');

const hasAnyStripeValue = (environment: Record<string, unknown>) =>
  STRIPE_REQUIRED_ENV_KEYS.some((key) => {
    const value = environment[key];
    return typeof value === 'string' && value.trim().length > 0;
  });

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const baseResult = baseEnvironmentSchema.safeParse(config);

  if (!baseResult.success) {
    throw new Error(
      `Invalid environment configuration: ${formatZodError(baseResult.error)}`,
    );
  }

  const environment = baseResult.data;
  const shouldValidateStripe =
    environment.NODE_ENV === 'production' ||
    environment.STRIPE_ENABLED ||
    hasAnyStripeValue(environment);

  if (!shouldValidateStripe) {
    return environment;
  }

  const stripeResult = stripeEnvironmentSchema.safeParse(environment);

  if (!stripeResult.success) {
    throw new Error(
      `Invalid Stripe environment configuration: ${formatZodError(stripeResult.error)}`,
    );
  }

  return stripeResult.data;
}
