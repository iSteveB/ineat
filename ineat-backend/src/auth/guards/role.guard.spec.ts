import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_ROLES_KEY } from '../decorators/requires-role.decorator';
import { RoleGuard } from './role.guard';

describe('RoleGuard', () => {
  let guard: RoleGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RoleGuard(reflector);
  });

  const createMockExecutionContext = (
    user?: any,
    requiredRoles: string[] = ['ADMIN'],
  ): ExecutionContext => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

    return context;
  };

  it('devrait laisser passer si aucun rôle n’est requis', () => {
    const context = createMockExecutionContext(undefined, []);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('devrait lancer UnauthorizedException sans utilisateur', () => {
    const context = createMockExecutionContext(undefined, ['ADMIN']);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('devrait lancer ForbiddenException si le rôle requis manque', () => {
    const context = createMockExecutionContext(
      { id: '123', role: 'USER' },
      ['ADMIN'],
    );

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('devrait laisser passer si le rôle requis est présent', () => {
    const context = createMockExecutionContext(
      { id: '123', role: 'ADMIN' },
      ['ADMIN'],
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('devrait lire les métadonnées REQUIRED_ROLES_KEY', () => {
    const context = createMockExecutionContext(undefined, []);
    const spy = jest.spyOn(reflector, 'getAllAndOverride');

    guard.canActivate(context);

    expect(spy).toHaveBeenCalledWith(REQUIRED_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});
