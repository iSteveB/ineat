import {
  ExecutionContext,
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

    request.user = user;
    return true;
  }
}
