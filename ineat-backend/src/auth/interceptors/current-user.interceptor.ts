// src/auth/interceptors/current-user.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class CurrentUserInterceptor implements NestInterceptor {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Si la requête contient déjà l'utilisateur (mis par le garde), on l'utilise
    if (request.user) {
      return next.handle();
    }

    // Sinon, on essaie d'extraire le token et de récupérer l'utilisateur
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        // Vérifier et décoder le token
        const payload = this.jwtService.verify(token);

        // Récupérer l'utilisateur complet
        const user = await this.authService.getProfile(payload.sub);

        // Attache l'utilisateur à la requête
        request.user = user;
      } catch (error) {
        // Ne pas jeter d'exception ici, car l'intercepteur peut être utilisé sur des routes publiques
        // L'absence d'utilisateur sera gérée par les gardes si nécessaire
      }
    }

    return next.handle();
  }
}
