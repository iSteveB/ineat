import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { GoogleAuthGuard } from '../guards/oauth-auth.guard';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

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
    // La logique est gérée par le GoogleAuthGuard
  }

  @Get('callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    // L'utilisateur a été authentifié par Google et stocké dans req.user
    const { user } = req;

    // Génère un JWT
    const authResult = await this.authService.login(user);

    // Redirige vers l'application frontend avec le token
    const clientUrl = this.configService.get('CLIENT_URL');
    const token = authResult.accessToken;

    // Redirection avec le token dans l'URL (à adapter selon votre frontend)
    res.redirect(`${clientUrl}/auth/callback?token=${token}`);
  }
}
