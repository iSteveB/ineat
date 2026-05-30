import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRES_ADMIN_KEY } from '../decorators/requires-admin.decorator';
import { AccessPolicyService } from '../services/access-policy.service';

/**
 * Guard pour protéger les routes nécessitant des droits Administrateur
 * 
 * Utilisation:
 * @UseGuards(JwtAuthGuard, AdminGuard)
 * @RequiresAdmin()
 * 
 * Le guard vérifie que:
 * 1. L'utilisateur est authentifié (doit être utilisé après JwtAuthGuard)
 * 2. L'utilisateur a le rôle ADMIN
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private accessPolicyService: AccessPolicyService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Vérifier si la route nécessite des droits admin
    const requiresAdmin = this.reflector.getAllAndOverride<boolean>(
      REQUIRES_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si la route ne nécessite pas de droits admin, laisser passer
    if (!requiresAdmin) {
      return true;
    }

    // Récupérer l'utilisateur depuis la requête (injecté par JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si pas d'utilisateur, c'est que JwtAuthGuard n'a pas été appliqué
    if (!user) {
      throw new UnauthorizedException(
        'Authentification requise pour accéder à cette ressource',
      );
    }

    const isAdmin =
      this.accessPolicyService.getCapabilities(user).canAccessAdmin;

    if (!isAdmin) {
      throw new ForbiddenException(
        'Droits administrateur requis pour accéder à cette ressource',
      );
    }

    return true;
  }
}
