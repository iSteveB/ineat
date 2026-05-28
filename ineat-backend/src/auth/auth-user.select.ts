import { Prisma } from '../../prisma/generated/prisma/client';

export const authUserSelect = {
  id: true,
  email: true,
  passwordHash: true,
  firstName: true,
  lastName: true,
  profileType: true,
  preferences: true,
  createdAt: true,
  updatedAt: true,
  subscription: true,
} satisfies Prisma.UserSelect;

export type AuthUser = Prisma.UserGetPayload<{
  select: typeof authUserSelect;
}>;
