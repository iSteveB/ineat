import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfileType } from '@prisma/client';

interface UpdatePersonalInfoDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  profileType?: ProfileType;
}

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * Met à jour les informations personnelles d'un utilisateur
   */
  async updatePersonalInfo(userId: string, updateData: UpdatePersonalInfoDto) {
    // Vérifier que l'utilisateur existe
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Si l'email est modifié, vérifier qu'il n'est pas déjà utilisé par un autre utilisateur
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateData.email },
      });

      if (emailExists) {
        throw new BadRequestException('Cette adresse email est déjà utilisée');
      }
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(updateData.firstName && { firstName: updateData.firstName }),
        ...(updateData.lastName && { lastName: updateData.lastName }),
        ...(updateData.email && { email: updateData.email }),
        ...(updateData.profileType && { profileType: updateData.profileType }),
      },
    });

    // Retourner l'utilisateur sans le mot de passe
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = updatedUser;

    return {
      success: true,
      data: {
        id: userWithoutPassword.id,
        email: userWithoutPassword.email,
        firstName: userWithoutPassword.firstName,
        lastName: userWithoutPassword.lastName,
        profileType: userWithoutPassword.profileType,
        subscription: userWithoutPassword.subscription || 'FREE',
        preferences: userWithoutPassword.preferences,
        createdAt: userWithoutPassword.createdAt.toISOString(),
        updatedAt: userWithoutPassword.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Récupère les informations d'un utilisateur
   */
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Retourner l'utilisateur sans le mot de passe
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      success: true,
      data: {
        id: userWithoutPassword.id,
        email: userWithoutPassword.email,
        firstName: userWithoutPassword.firstName,
        lastName: userWithoutPassword.lastName,
        profileType: userWithoutPassword.profileType,
        subscription: userWithoutPassword.subscription || 'FREE',
        preferences: userWithoutPassword.preferences,
        createdAt: userWithoutPassword.createdAt.toISOString(),
        updatedAt: userWithoutPassword.updatedAt.toISOString(),
      },
    };
  }
}
