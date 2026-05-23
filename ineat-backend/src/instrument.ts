import 'dotenv/config';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: nodeEnv,
    integrations: [nodeProfilingIntegration()],
    enableLogs: process.env.SENTRY_ENABLE_LOGS !== 'false',
    tracesSampleRate: Number(
      process.env.SENTRY_TRACES_SAMPLE_RATE ?? (isProduction ? 0.1 : 1.0),
    ),
    profileSessionSampleRate: Number(
      process.env.SENTRY_PROFILE_SAMPLE_RATE ?? (isProduction ? 0.05 : 1.0),
    ),
    profileLifecycle: 'trace',
    sendDefaultPii: process.env.SENTRY_SEND_DEFAULT_PII === 'true',
  });
}
