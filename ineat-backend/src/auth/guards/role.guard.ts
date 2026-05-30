import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  REQUIRED_ROLES_KEY,
  RequiredRole,
} from '../decorators/requires-role.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RequiredRole[]>(
      REQUIRED_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException(
        'Authentification requise pour accéder à cette ressource',
      );
    }

    if (!requiredRoles.includes(user.role || 'USER')) {
      throw new ForbiddenException(
        'Droits administrateur requis pour accéder à cette ressource',
      );
    }

    return true;
  }
}
