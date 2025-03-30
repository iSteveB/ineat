import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';

// Interface pour le payload JWT
interface JwtPayload {
  email: string;
  sub: string; // User ID
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      // Extraire le token du cookie
      jwtFromRequest: (req: Request) => {
        // Vérifier d'abord le cookie
        if (req.cookies && req.cookies.auth_token) {
          return req.cookies.auth_token;
        }

        // Vérifier ensuite l'en-tête Authorization (pour la compatibilité API/mobile)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          return authHeader.substring(7);
        }

        // Aucun token trouvé
        return null;
      },
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: false, // Pas besoin de la requête dans la méthode validate
    });
  }

  async validate(payload: JwtPayload) {
    // Valider l'utilisateur à partir du payload JWT
    const { sub: id } = payload;

    // Récupérer l'utilisateur depuis la base de données
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    // Si l'utilisateur n'existe pas, lancer une exception
    if (!user) {
      throw new UnauthorizedException(
        'Utilisateur non trouvé ou session invalide',
      );
    }

    // Supprimer le mot de passe pour des raisons de sécurité
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...SafeUser } = user;

    // Retourner l'utilisateur sans le mot de passe
    return SafeUser;
  }
}
