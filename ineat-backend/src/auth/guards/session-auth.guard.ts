import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BetterAuthSessionService } from '../services/better-auth-session.service';

@Injectable()
export class SessionAuthGuard {
  constructor(
    private reflector: Reflector,
    private betterAuthSessionService: BetterAuthSessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user =
      await this.betterAuthSessionService.getAuthenticatedUser(request);

    if (!user) {
      throw new UnauthorizedException('Authentification requise');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Confirmez votre adresse e-mail pour continuer : le lien vous attend dans votre boîte mail.',
      });
    }

    request.user = user;
    return true;
  }
}
