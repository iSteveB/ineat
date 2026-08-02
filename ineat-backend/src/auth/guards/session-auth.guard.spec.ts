import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionAuthGuard } from './session-auth.guard';
import { BetterAuthSessionService } from '../services/better-auth-session.service';

describe('SessionAuthGuard', () => {
  const createGuard = (user: Record<string, unknown> | null) => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const sessionService = {
      getAuthenticatedUser: jest.fn().mockResolvedValue(user),
    } as unknown as BetterAuthSessionService;
    const request: Record<string, unknown> = {};
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    return {
      guard: new SessionAuthGuard(reflector, sessionService),
      context,
      request,
    };
  };

  it('refuse une requête sans session', async () => {
    const { guard, context } = createGuard(null);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("refuse une session dont l'adresse email n'est pas vérifiée", async () => {
    const { guard, context, request } = createGuard({
      id: 'user-1',
      email: 'jane@example.com',
      emailVerified: false,
    });

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Votre adresse email doit être vérifiée avant de continuer.',
      },
    });
    expect(request.user).toBeUndefined();
  });

  it("autorise une session dont l'adresse email est vérifiée", async () => {
    const user = {
      id: 'user-1',
      email: 'jane@example.com',
      emailVerified: true,
    };
    const { guard, context, request } = createGuard(user);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(user);
  });
});
