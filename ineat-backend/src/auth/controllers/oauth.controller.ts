// src/auth/controllers/oauth.controller.ts
import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { GoogleAuthGuard } from '../guards/oauth-auth.guard';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

// Interface pour l'utilisateur Google dans la requête
interface RequestWithGoogleUser extends Request {
  user: {
    email: string;
    firstName: string;
    lastName: string;
    photo?: string;
  };
}

@Controller('auth/google')
export class OAuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get()
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Cette route initie l'authentification Google
    // La logique est gérée par le garde GoogleAuthGuard
    // Pas besoin de corps de fonction
  }

  @Get('callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(
    @Req() req: RequestWithGoogleUser,
    @Res() res: Response,
  ) {
    try {
      // L'utilisateur a été authentifié par Google et les infos sont dans req.user
      const { user } = req;

      // Utiliser le service d'authentification pour créer ou mettre à jour l'utilisateur
      // et définir les cookies de session
      await this.authService.findOrCreateGoogleUser(user, res);

      // Rediriger vers l'application frontend
      const clientUrl = this.configService.get<string>('CLIENT_URL');

      // Redirection simple maintenant que le cookie est défini
      res.redirect(`${clientUrl}/auth/success`);
    } catch (error) {
      // En cas d'erreur, rediriger vers une page d'erreur
      const clientUrl = this.configService.get<string>('CLIENT_URL');
      res.redirect(
        `${clientUrl}/auth/error?message=${encodeURIComponent(error.message)}`,
      );
    }
  }
}
