import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, SafeUserDto } from '../dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import { CookieOptions, Response } from 'express';
import { User } from '../../../prisma/generated/prisma/client';
import { randomUUID } from 'crypto';
import { ObservabilityService } from '../../observability/observability.service';
import { AuthUser, authUserSelect } from '../auth-user.select';
import { toSafeUserResponseWithUsage } from '../auth-user-response';
import { AccessPolicyService } from './access-policy.service';
import { UsageQuotaService } from './usage-quota.service';

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
    private observabilityService: ObservabilityService,
    private accessPolicyService: AccessPolicyService,
    private usageQuotaService: UsageQuotaService,
  ) {}

  private getAuthCookieOptions(): CookieOptions {
    const isProd = this.configService.get('NODE_ENV') === 'production';

    return {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? ('none' as const) : ('lax' as const),
      path: '/',
    };
  }

  // Valider un utilisateur pour l'authentification locale
  async validateUser(
    email: string,
    password: string,
  ): Promise<SafeUserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: authUserSelect,
    });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      this.observabilityService.trackEvent('auth.login.success', 'info', 'Login success', {
        userId: user.id,
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...result } = user;
      return result as SafeUserDto;
    }

    this.observabilityService.trackEvent('auth.login.failure', 'warn', 'Login failure', {
      emailDomain: email.split('@')[1] ?? 'unknown',
      reason: user ? 'invalid_password' : 'user_not_found',
    });

    return null;
  }

  async setCookies(user: SafeUserDto, response: Response) {
    // Générer le JWT token
    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload);

    // Définir le cookie HTTP-only
    response.cookie('auth_token', accessToken, {
      ...this.getAuthCookieOptions(),
      maxAge: 24 * 60 * 60 * 1000, // 24 heures (ou utiliser la valeur de JWT_EXPIRES_IN)
    });

    // Retourner les informations utilisateur dans le format d'API response standardisé
    return {
      success: true,
      message: 'Authentification réussie',
      data: {
        user: {
          ...(await toSafeUserResponseWithUsage(
            user,
            this.accessPolicyService,
            this.usageQuotaService,
          )),
        },
        accessToken, // Pour compatibilité avec les clients mobiles
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Méthode de connexion
  async login(user: User, response: Response) {
    return this.setCookies(user as SafeUserDto, response);
  }

  async logout(response: Response) {
    // Effacer le cookie en définissant une date d'expiration dans le passé
    response.cookie('auth_token', '', {
      ...this.getAuthCookieOptions(),
      expires: new Date(0), // Date dans le passé
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
      select: authUserSelect,
    });

    if (existingUser) {
      this.observabilityService.trackEvent(
        'auth.register.conflict',
        'warn',
        'Register conflict',
        {
          existingUserId: existingUser.id,
          emailDomain: registerDto.email.split('@')[1] ?? 'unknown',
        },
      );
      throw new ConflictException('Cet email est déjà utilisé');
    }

    // Hacher le mot de passe
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

    // Créer l'utilisateur
    const newUser = await this.prisma.user.create({
      data: {
        id: randomUUID(),
        email: registerDto.email,
        passwordHash,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        profileType: registerDto.profileType,
        role: 'USER',
        subscriptionPlan: 'FREE',
        subscriptionStatus: 'ACTIVE',
        preferences: registerDto.preferences || {},
        updatedAt: new Date(),
      },
      select: authUserSelect,
    });

    // Supprimer le mot de passe avant de renvoyer l'utilisateur
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...user } = newUser;

    this.observabilityService.trackEvent(
      'auth.register.success',
      'info',
      'User registered',
      {
        userId: newUser.id,
        profileType: newUser.profileType,
      },
    );

    return this.setCookies(user as SafeUserDto, response);
  }

  // Trouver ou créer un utilisateur avec Google OAuth
  async findOrCreateGoogleUser(googleUser: GoogleUserData, response: Response) {
    const { email, firstName, lastName, photo } = googleUser;

    // Chercher l'utilisateur par email
    let user: AuthUser | null = await this.prisma.user.findUnique({
      where: { email },
      select: authUserSelect,
    });

    // Si l'utilisateur n'existe pas, le créer
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          id: randomUUID(),
          email,
          firstName,
          lastName,
          passwordHash: '',
          profileType: 'SINGLE',
          role: 'USER',
          subscriptionPlan: 'FREE',
          subscriptionStatus: 'ACTIVE',
          preferences: {
            profilePicture: photo,
            oauth: 'google',
          },
          updatedAt: new Date(),
        },
        select: authUserSelect,
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
      select: authUserSelect,
    });

    if (!user) {
      this.observabilityService.trackEvent(
        'auth.profile.not_found',
        'warn',
        'Profile user not found',
        { userId },
      );
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;

    // Retourner dans le format d'API response standardisé
    return {
      success: true,
      data: {
        ...(await toSafeUserResponseWithUsage(
          result as SafeUserDto,
          this.accessPolicyService,
          this.usageQuotaService,
        )),
      },
    };
  }

}
