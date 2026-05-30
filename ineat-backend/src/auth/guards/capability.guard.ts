import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  REQUIRED_CAPABILITIES_KEY,
  RequiredCapability,
} from '../decorators/requires-capability.decorator';
import { AccessPolicyService } from '../services/access-policy.service';

@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private accessPolicyService: AccessPolicyService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredCapabilities = this.reflector.getAllAndOverride<
      RequiredCapability[]
    >(REQUIRED_CAPABILITIES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredCapabilities?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException(
        'Authentification requise pour accéder à cette ressource',
      );
    }

    const capabilities = this.accessPolicyService.getCapabilities(user);
    const hasAllCapabilities = requiredCapabilities.every(
      (capability) => capabilities[capability] === true,
    );

    if (!hasAllCapabilities) {
      throw new ForbiddenException(
        'Droits insuffisants pour accéder à cette fonctionnalité',
      );
    }

    return true;
  }
}
