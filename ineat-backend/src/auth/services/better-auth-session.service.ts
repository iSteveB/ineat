import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { authUserSelect } from '../auth-user.select';

const toWebHeaders = (headers: Request['headers']): Headers => {
  const webHeaders = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => webHeaders.append(key, entry));
      continue;
    }

    webHeaders.set(key, value);
  }

  return webHeaders;
};

@Injectable()
export class BetterAuthSessionService {
  constructor(private prisma: PrismaService) {}

  async getAuthenticatedUser(req: Request) {
    try {
      const { auth } = await import('../../lib/auth');
      const session = await auth.api.getSession({
        headers: toWebHeaders(req.headers),
      });

      if (!session?.user?.id) {
        return null;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: session.user.id },
        select: authUserSelect,
      });

      if (!user) {
        return null;
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...safeUser } = user;
      return safeUser;
    } catch {
      return null;
    }
  }
}
