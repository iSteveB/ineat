import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../prisma/generated/prisma/client';
import { hashPassword, verifyPassword } from './password';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const configuredTrustedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  'http://localhost:5173',
  'https://localhost:5173',
].filter(Boolean) as string[];

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const passwordResetWebhookUrl = process.env.PASSWORD_RESET_WEBHOOK_URL;

const emailAuthPaths = new Set(['/sign-in/email', '/sign-up/email']);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const auth = betterAuth({
  appName: 'InEat',
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: '/api/auth',
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  trustedOrigins: configuredTrustedOrigins,
  user: {
    modelName: 'User',
    fields: {
      image: 'avatarUrl',
    },
    additionalFields: {
      passwordHash: {
        type: 'string',
        defaultValue: '',
        input: false,
        returned: false,
      },
      firstName: {
        type: 'string',
        defaultValue: '',
      },
      lastName: {
        type: 'string',
        defaultValue: '',
      },
      profileType: {
        type: 'string',
        defaultValue: 'SINGLE',
      },
      preferences: {
        type: 'json',
        defaultValue: {},
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }, request) => {
      if (!passwordResetWebhookUrl) {
        console.warn(
          'Password reset requested but PASSWORD_RESET_WEBHOOK_URL is not configured.',
          {
            email: user.email,
            resetUrl: url,
          },
        );
        return;
      }

      const response = await fetch(passwordResetWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: user.email,
          name: user.name,
          resetUrl: url,
          userAgent: request?.headers.get('user-agent') ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error('Password reset webhook failed');
      }
    },
    password: {
      hash: hashPassword,
      verify: verifyPassword,
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (
        !emailAuthPaths.has(ctx.path) ||
        !isRecord(ctx.body) ||
        typeof ctx.body.email !== 'string'
      ) {
        return;
      }

      return {
        context: {
          ...ctx,
          body: {
            ...ctx.body,
            email: ctx.body.email.trim().toLowerCase(),
          },
        },
      };
    }),
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : undefined,
  advanced: {
    cookiePrefix: 'ineat',
    defaultCookieAttributes: {
      sameSite: 'none',
      secure: true,
    },
  },
});

export type InEatAuth = typeof auth;
export default auth;
