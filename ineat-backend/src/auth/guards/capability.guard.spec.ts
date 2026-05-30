import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_CAPABILITIES_KEY } from '../decorators/requires-capability.decorator';
import { AccessPolicyService } from '../services/access-policy.service';
import { CapabilityGuard } from './capability.guard';

describe('CapabilityGuard', () => {
  let guard: CapabilityGuard;
  let reflector: Reflector;
  let accessPolicyService: AccessPolicyService;

  beforeEach(() => {
    reflector = new Reflector();
    accessPolicyService = new AccessPolicyService();
    guard = new CapabilityGuard(reflector, accessPolicyService);
  });

  const createMockExecutionContext = (
    user?: any,
    requiredCapabilities: string[] = ['canImportDrive'],
  ): ExecutionContext => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(requiredCapabilities);

    return context;
  };

  it('devrait laisser passer si aucune capability n’est requise', () => {
    const context = createMockExecutionContext(undefined, []);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('devrait lancer UnauthorizedException sans utilisateur', () => {
    const context = createMockExecutionContext(undefined, ['canImportDrive']);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('devrait lancer ForbiddenException si la capability manque', () => {
    const context = createMockExecutionContext(
      {
        id: '123',
        role: 'USER',
        subscriptionPlan: 'FREE',
        subscriptionStatus: 'ACTIVE',
      },
      ['canImportDrive'],
    );

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('devrait laisser passer si la capability est présente', () => {
    const context = createMockExecutionContext(
      {
        id: '123',
        role: 'USER',
        subscriptionPlan: 'PREMIUM',
        subscriptionStatus: 'ACTIVE',
      },
      ['canImportDrive'],
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('devrait refuser si une des capabilities requises manque', () => {
    const context = createMockExecutionContext(
      {
        id: '123',
        role: 'USER',
        subscriptionPlan: 'FREE',
        subscriptionStatus: 'ACTIVE',
      },
      ['canUseRecipes', 'canImportDrive'],
    );

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('devrait lire les métadonnées REQUIRED_CAPABILITIES_KEY', () => {
    const context = createMockExecutionContext(undefined, []);
    const spy = jest.spyOn(reflector, 'getAllAndOverride');

    guard.canActivate(context);

    expect(spy).toHaveBeenCalledWith(REQUIRED_CAPABILITIES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});
