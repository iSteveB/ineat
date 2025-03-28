// src/auth/services/auth.service.ts
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // Valider un utilisateur pour l'authentification locale
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...result } = user;
      return result;
    }

    return null;
  }

  // Générer un JWT
  async login(user: any) {
    const payload = { email: user.email, sub: user.id };

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileType: user.profileType,
      },
      accessToken: this.jwtService.sign(payload),
    };
  }

  // Enregistrer un nouvel utilisateur
  async register(registerDto: RegisterDto) {
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

    // Générer un JWT
    const payload = { email: user.email, sub: user.id };

    return {
      user,
      accessToken: this.jwtService.sign(payload),
    };
  }

  // Trouver ou créer un utilisateur avec Google OAuth
  async findOrCreateGoogleUser(googleUser: any) {
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

    return result;
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
