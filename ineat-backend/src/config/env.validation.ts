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

const optionalSchedulerMode = z.preprocess(
  emptyToUndefined,
  z.enum(['legacy', 'bullmq', 'disabled']).default('legacy'),
);

const optionalDeliveryMode = z.preprocess(
  emptyToUndefined,
  z.enum(['legacy', 'bullmq']).default('legacy'),
);

const baseEnvironmentSchema = z
  .object({
    NODE_ENV: z.string().default('development'),
    NOTIFICATION_SYNC_INTERVAL_MS: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(60_000).optional(),
    ),
    NOTIFICATION_RETENTION_DAYS: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(30).default(180),
    ),
    ADMIN_AUDIT_RETENTION_DAYS: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(30).max(3650).default(365),
    ),
    EMAIL_ENABLED: optionalBoolean,
    RESEND_API_KEY: optionalString,
    EMAIL_FROM: optionalString,
    EMAIL_REPLY_TO: optionalString,
    SUPPORT_EMAIL: z.preprocess(
      emptyToUndefined,
      z.string().trim().email().default('support@ineat.store'),
    ),
    RESEND_WEBHOOK_SECRET: optionalString,
    STRIPE_ENABLED: optionalBoolean,
    STRIPE_SECRET_KEY: optionalString,
    STRIPE_PRICE_PREMIUM_MONTHLY_EUR: optionalString,
    STRIPE_PRICE_PREMIUM_YEARLY_EUR: optionalString,
    STRIPE_WEBHOOK_SECRET: optionalString,
    STRIPE_CHECKOUT_SUCCESS_URL: optionalString,
    STRIPE_CHECKOUT_CANCEL_URL: optionalString,
    STRIPE_CUSTOMER_PORTAL_RETURN_URL: optionalString,
    REDIS_URL: optionalString,
    REDIS_KEY_PREFIX: optionalString,
    NOTIFICATION_SCHEDULER_MODE: optionalSchedulerMode,
    NOTIFICATION_DELIVERY_MODE: optionalDeliveryMode,
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

const emailEnvironmentSchema = baseEnvironmentSchema.extend({
  RESEND_API_KEY: z.string().trim().startsWith('re_', {
    message: 'must be a Resend API key',
  }),
  EMAIL_FROM: z
    .string()
    .trim()
    .regex(/^.+<[^<>\s]+@[^<>\s]+>$/, {
      message: 'must use the format Name <email@example.com>',
    }),
  EMAIL_REPLY_TO: z.string().trim().email(),
});

const productionEnvironmentSchema = baseEnvironmentSchema.extend({
  REDIS_URL: z.string().trim().url(),
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

const hasAnyEmailValue = (environment: Record<string, unknown>) =>
  ['RESEND_API_KEY', 'EMAIL_FROM', 'EMAIL_REPLY_TO'].some((key) => {
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
  if (environment.NODE_ENV === 'production') {
    const productionResult = productionEnvironmentSchema.safeParse(environment);
    if (!productionResult.success) {
      throw new Error(
        `Invalid production environment configuration: ${formatZodError(productionResult.error)}`,
      );
    }
  }
  const shouldValidateEmail =
    environment.NODE_ENV === 'production' ||
    environment.EMAIL_ENABLED ||
    hasAnyEmailValue(environment);

  if (shouldValidateEmail) {
    const emailResult = emailEnvironmentSchema.safeParse(environment);

    if (!emailResult.success) {
      throw new Error(
        `Invalid email environment configuration: ${formatZodError(emailResult.error)}`,
      );
    }
  }

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
