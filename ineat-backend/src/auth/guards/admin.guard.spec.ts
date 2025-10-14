import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminGuard } from './admin.guard';
import { REQUIRES_ADMIN_KEY } from '../decorators/requires-admin.decorator';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new AdminGuard(reflector);
  });

  const createMockExecutionContext = (user?: any, requiresAdmin = true): ExecutionContext => {
    const mockRequest = {
      user,
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiresAdmin);

    return context;
  };

  describe('Quand la route ne nécessite pas de droits admin', () => {
    it('devrait laisser passer sans vérifier l\'utilisateur', () => {
      const context = createMockExecutionContext(undefined, false);

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('Quand la route nécessite des droits admin', () => {
    it('devrait lancer UnauthorizedException si aucun utilisateur n\'est présent', () => {
      const context = createMockExecutionContext(undefined, true);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(
        'Authentification requise pour accéder à cette ressource',
      );
    });

    it('devrait lancer ForbiddenException si l\'utilisateur est FREE', () => {
      const context = createMockExecutionContext(
        { id: '123', email: 'test@test.com', subscription: 'FREE' },
        true,
      );

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Droits administrateur requis pour accéder à cette ressource',
      );
    });

    it('devrait lancer ForbiddenException si l\'utilisateur est PREMIUM', () => {
      const context = createMockExecutionContext(
        { id: '123', email: 'test@test.com', subscription: 'PREMIUM' },
        true,
      );

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Droits administrateur requis pour accéder à cette ressource',
      );
    });

    it('devrait lancer ForbiddenException si l\'utilisateur n\'a pas de subscription', () => {
      const context = createMockExecutionContext(
        { id: '123', email: 'test@test.com' },
        true,
      );

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('devrait laisser passer si l\'utilisateur est ADMIN', () => {
      const context = createMockExecutionContext(
        { id: '123', email: 'test@test.com', subscription: 'ADMIN' },
        true,
      );

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('Vérification des métadonnées', () => {
    it('devrait utiliser le bon REQUIRES_ADMIN_KEY', () => {
      const context = createMockExecutionContext(undefined, false);
      const spy = jest.spyOn(reflector, 'getAllAndOverride');

      guard.canActivate(context);

      expect(spy).toHaveBeenCalledWith(REQUIRES_ADMIN_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });
});