import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRES_PREMIUM_KEY } from '../decorators/requires-premium.decorator';

/**
 * Guard pour protéger les routes nécessitant un abonnement Premium
 * 
 * Utilisation:
 * @UseGuards(JwtAuthGuard, PremiumGuard)
 * @RequiresPremium()
 * 
 * Le guard vérifie que:
 * 1. L'utilisateur est authentifié (doit être utilisé après JwtAuthGuard)
 * 2. L'utilisateur a un abonnement PREMIUM ou ADMIN
 */
@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Vérifier si la route nécessite un abonnement premium
    const requiresPremium = this.reflector.getAllAndOverride<boolean>(
      REQUIRES_PREMIUM_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si la route ne nécessite pas de premium, laisser passer
    if (!requiresPremium) {
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

    // Vérifier que l'utilisateur a un abonnement premium
    const subscription = user.subscription || 'FREE';
    const isPremium = subscription === 'PREMIUM' || subscription === 'ADMIN';

    if (!isPremium) {
      throw new ForbiddenException(
        'Un abonnement Premium est requis pour accéder à cette fonctionnalité',
      );
    }

    return true;
  }
}