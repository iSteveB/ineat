import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../prisma/generated/prisma/client';
import { hashPassword, verifyPassword } from './password';
import { getAllowedOrigins } from '../config/origins';
import {
  createRecipientReference,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from '../email/email-sender';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const configuredTrustedOrigins = getAllowedOrigins(
  process.env.NODE_ENV,
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
);
const emailEnabled =
  process.env.NODE_ENV === 'production'
    ? process.env.EMAIL_ENABLED !== 'false'
    : process.env.EMAIL_ENABLED === 'true';

const emailAuthPaths = new Set(['/sign-in/email', '/sign-up/email']);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const auth = betterAuth({
  appName: 'InEat',
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: '/auth',
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
      defaultServings: {
        type: 'number',
        defaultValue: 4,
      },
      primaryGoal: {
        type: 'string',
        required: false,
      },
      preferences: {
        type: 'json',
        defaultValue: {},
      },
    },
  },
  emailVerification: {
    expiresIn: 60 * 60,
    sendOnSignUp: emailEnabled,
    sendOnSignIn: emailEnabled,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      if (!emailEnabled) return;
      await sendEmailVerificationEmail({
        to: user.email,
        name: user.name,
        verificationUrl: url,
      });
    },
    afterEmailVerification: async (verifiedUser) => {
      if (!emailEnabled) return;
      const appUrl = process.env.FRONTEND_URL?.trim().replace(/\/$/, '');
      if (!appUrl) {
        throw new Error('FRONTEND_URL is required to send the welcome email');
      }

      const user = await prisma.user.findUnique({
        where: { id: verifiedUser.id },
        select: { id: true, email: true, firstName: true },
      });
      if (!user) return;

      const suppression = await prisma.emailSuppression.findUnique({
        where: { recipientRef: createRecipientReference(user.email) },
        select: { recipientRef: true },
      });
      if (suppression) return;

      const claimedAt = new Date();
      const claim = await prisma.user.updateMany({
        where: { id: user.id, welcomeEmailSentAt: null },
        data: { welcomeEmailSentAt: claimedAt },
      });
      if (claim.count === 0) return;

      try {
        await sendWelcomeEmail({
          to: user.email,
          firstName: user.firstName,
          appUrl: `${appUrl}/app`,
          userId: user.id,
        });
      } catch (error) {
        await prisma.user.updateMany({
          where: { id: user.id, welcomeEmailSentAt: claimedAt },
          data: { welcomeEmailSentAt: null },
        });
        throw error;
      }
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: emailEnabled,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl: url,
      });
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

      const email = ctx.body.email.trim().toLowerCase();
      if (ctx.path === '/sign-in/email') {
        const account = await prisma.user.findUnique({
          where: { email },
          select: { id: true, accountStatus: true, suspendedUntil: true },
        });
        if (
          account?.accountStatus === 'SUSPENDED' &&
          account.suspendedUntil &&
          account.suspendedUntil.getTime() <= Date.now()
        ) {
          await prisma.user.update({
            where: { id: account.id },
            data: {
              accountStatus: 'ACTIVE',
              accountStatusChangedAt: new Date(),
              suspendedUntil: null,
              moderationReason: null,
            },
          });
        } else if (account && account.accountStatus !== 'ACTIVE') {
          throw new APIError('FORBIDDEN', {
            message: "Ce compte n'est pas accessible.",
          });
        }
      }

      return {
        context: {
          ...ctx,
          body: {
            ...ctx.body,
            email,
          },
        },
      };
    }),
  },
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
