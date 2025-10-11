import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfileType, Prisma } from '@prisma/client';
import {
  UpdateDietaryRestrictionsDto,
  DietaryPreferences,
} from '../dto/update-dietary-restrictions.dto';

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

  /**
   * Met à jour les restrictions alimentaires d'un utilisateur
   */
  async updateDietaryRestrictions(
    userId: string,
    updateData: UpdateDietaryRestrictionsDto,
  ) {
    // Vérifier que l'utilisateur existe
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Récupérer les préférences existantes avec le bon typage
    const currentPreferences =
      (existingUser.preferences as unknown as DietaryPreferences) || {
        allergens: [],
        diets: [],
      };

    // Fusionner les nouvelles données avec les préférences existantes
    const updatedPreferences: DietaryPreferences = {
      allergens: updateData.allergens ?? currentPreferences.allergens ?? [],
      diets: updateData.diets ?? currentPreferences.diets ?? [],
    };

    // Mettre à jour l'utilisateur avec les nouvelles préférences
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferences: updatedPreferences as unknown as Prisma.InputJsonValue,
      },
    });

    // Retourner l'utilisateur sans le mot de passe
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = updatedUser;

    return {
      success: true,
      message: 'Restrictions alimentaires mises à jour avec succès',
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
   * Récupère les restrictions alimentaires d'un utilisateur
   */
  async getDietaryRestrictions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        preferences: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const preferences = (user.preferences as unknown as DietaryPreferences) || {
      allergens: [],
      diets: [],
    };

    return {
      success: true,
      data: {
        allergens: preferences.allergens || [],
        diets: preferences.diets || [],
      },
    };
  }
}
