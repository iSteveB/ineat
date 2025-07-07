// src/auth/services/auth.service.ts
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, SafeUserDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { User } from '@prisma/client';

interface GoogleUserData {
  email: string;
  firstName: string;
  lastName: string;
  photo?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // Valider un utilisateur pour l'authentification locale
  async validateUser(
    email: string,
    password: string,
  ): Promise<SafeUserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...result } = user;
      return result as SafeUserDto;
    }

    return null;
  }

  async setCookies(user: SafeUserDto, response: Response) {
    // Générer le JWT token
    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload);

    // Configurer les options du cookie
    const isProd = this.configService.get('NODE_ENV') === 'production';

    // Définir le cookie HTTP-only
    response.cookie('auth_token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: isProd ? 'strict' : 'none', // Protection CSRF
      maxAge: 24 * 60 * 60 * 1000, // 24 heures (ou utiliser la valeur de JWT_EXPIRES_IN)
      path: '/', // Disponible sur toutes les routes
    });

    // Retourner les informations utilisateur pour la réponse API
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileType: user.profileType,
      },
      // Inclus quand même le token dans la réponse pour les clients mobiles
      accessToken,
    };
  }

  // Méthode de connexion
  async login(user: User, response: Response) {
    return this.setCookies(user as SafeUserDto, response);
  }

  async logout(response: Response) {
    // Effacer le cookie en définissant une date d'expiration dans le passé
    response.cookie('auth_token', '', {
      httpOnly: true,
      secure: true,
      expires: new Date(0), // Date dans le passé
      path: '/',
    });

    return {
      success: true,
      message: 'Déconnexion réussie',
    };
  }

  // Enregistrer un nouvel utilisateur
  async register(registerDto: RegisterDto, response: Response) {
    // Vérifier si l'email existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    // Hacher le mot de passe
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

    // Créer l'utilisateur
    const newUser = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        profileType: registerDto.profileType,
        preferences: registerDto.preferences || {},
      },
    });

    // Supprimer le mot de passe avant de renvoyer l'utilisateur
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...user } = newUser;

    return this.setCookies(user as SafeUserDto, response);
  }

  // Trouver ou créer un utilisateur avec Google OAuth
  async findOrCreateGoogleUser(googleUser: GoogleUserData, response: Response) {
    const { email, firstName, lastName, photo } = googleUser;

    // Chercher l'utilisateur par email
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Si l'utilisateur n'existe pas, le créer
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          passwordHash: '', // Pas de mot de passe pour les utilisateurs OAuth
          profileType: 'SINGLE', // Valeur par défaut, à personnaliser plus tard
          preferences: {
            profilePicture: photo,
            oauth: 'google',
          },
        },
      });
    }

    // Supprimer le mot de passe du résultat
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;

    return this.setCookies(result as SafeUserDto, response);
  }

  // Récupérer le profil de l'utilisateur courant
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return result;
  }
}
