import 'dotenv/config';
import { betterAuth } from 'better-auth';
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
    password: {
      hash: hashPassword,
      verify: verifyPassword,
    },
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
  },
});

export type InEatAuth = typeof auth;
export default auth;
