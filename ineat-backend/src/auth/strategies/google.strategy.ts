// src/auth/strategies/google.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';

// Interface pour les données utilisateur reçues de Google
interface GoogleUser {
  email: string;
  firstName: string;
  lastName: string;
  photo: string;
  accessToken: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      // Extraire les informations pertinentes du profil Google
      const { name, emails, photos } = profile;

      if (!emails || emails.length === 0 || !emails[0].value) {
        return done(
          new Error('Aucune adresse email trouvée dans le profil Google'),
          null,
        );
      }

      // Construire l'objet d'information utilisateur
      const googleUser: GoogleUser = {
        email: emails[0].value,
        firstName: name?.givenName || '',
        lastName: name?.familyName || '',
        photo: photos && photos.length > 0 ? photos[0].value : '',
        accessToken,
      };

      // La méthode validate ne crée pas de cookies directement ici,
      // car elle n'a pas accès à l'objet response.
      // On passe simplement les informations utilisateur au contrôleur OAuth
      // qui s'occupera de la création des cookies.

      done(null, googleUser);
    } catch (error) {
      done(error, null);
    }
  }
}
