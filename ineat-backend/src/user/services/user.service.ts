import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrimaryGoal, Prisma } from '../../../prisma/generated/prisma/client';
import {
  UpdateDietaryRestrictionsDto,
  DietaryPreferences,
} from '../dto/update-dietary-restrictions.dto';
import { toSafeUserResponseWithUsage } from '../../auth/auth-user-response';
import { AccessPolicyService } from '../../auth/services/access-policy.service';
import { UsageQuotaService } from '../../auth/services/usage-quota.service';
import { hashPassword, verifyPassword } from '../../lib/password';
import { UpdatePasswordDto } from '../dto/update-password.dto';

interface UpdatePersonalInfoDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  defaultServings?: number;
  primaryGoal?: PrimaryGoal | null;
}

const PRIMARY_GOALS = new Set<string>(Object.values(PrimaryGoal));

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private accessPolicyService: AccessPolicyService,
    private usageQuotaService: UsageQuotaService,
  ) {}

  /**
   * Met à jour les informations personnelles d'un utilisateur
   */
  async updatePersonalInfo(userId: string, updateData: UpdatePersonalInfoDto) {
    if (
      updateData.defaultServings !== undefined &&
      (!Number.isInteger(updateData.defaultServings) ||
        updateData.defaultServings < 1 ||
        updateData.defaultServings > 20)
    ) {
      throw new BadRequestException(
        'Le nombre de couverts doit être un entier compris entre 1 et 20',
      );
    }
    if (
      updateData.primaryGoal !== undefined &&
      updateData.primaryGoal !== null &&
      !PRIMARY_GOALS.has(updateData.primaryGoal)
    ) {
      throw new BadRequestException('Objectif principal invalide');
    }
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
        ...(updateData.defaultServings !== undefined && {
          defaultServings: updateData.defaultServings,
        }),
        ...(updateData.primaryGoal !== undefined && {
          primaryGoal: updateData.primaryGoal,
        }),
      },
    });

    // Retourner l'utilisateur sans le mot de passe
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = updatedUser;

    return {
      success: true,
      data: {
        ...(await toSafeUserResponseWithUsage(
          userWithoutPassword as any,
          this.accessPolicyService,
          this.usageQuotaService,
        )),
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
        ...(await toSafeUserResponseWithUsage(
          userWithoutPassword as any,
          this.accessPolicyService,
          this.usageQuotaService,
        )),
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
      existingUser.preferences && typeof existingUser.preferences === 'object'
        ? (existingUser.preferences as Record<string, unknown> &
            DietaryPreferences)
        : ({ allergens: [], diets: [] } as Record<string, unknown> &
            DietaryPreferences);

    // Fusionner les nouvelles données avec les préférences existantes
    const updatedPreferences = {
      ...currentPreferences,
      allergens: updateData.allergens ?? currentPreferences.allergens ?? [],
      diets: updateData.diets ?? currentPreferences.diets ?? [],
    };

    // Mettre à jour l'utilisateur avec les nouvelles préférences
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferences: updatedPreferences as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      success: true,
      message: 'Restrictions alimentaires mises à jour avec succès',
      data: {
        allergens: updatedPreferences.allergens,
        diets: updatedPreferences.diets,
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

  async updatePassword(userId: string, updateData: UpdatePasswordDto) {
    const credentialAccount = await this.prisma.account.findFirst({
      where: {
        userId,
        providerId: 'credential',
      },
      select: {
        id: true,
        password: true,
      },
    });

    if (!credentialAccount?.password) {
      throw new BadRequestException({
        code: 'PASSWORD_CREDENTIAL_NOT_FOUND',
        message:
          "Ce compte n'a pas de mot de passe local. Utilisez votre fournisseur de connexion.",
      });
    }

    const isCurrentPasswordValid = await verifyPassword({
      hash: credentialAccount.password,
      password: updateData.currentPassword,
    });

    if (!isCurrentPasswordValid) {
      throw new BadRequestException({
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'Le mot de passe actuel est incorrect',
      });
    }

    const newPasswordHash = await hashPassword(updateData.newPassword);

    await this.prisma.account.update({
      where: {
        id: credentialAccount.id,
      },
      data: {
        password: newPasswordHash,
      },
    });

    return {
      success: true,
      message: 'Mot de passe mis à jour avec succès',
    };
  }

  async deleteAccount(userId: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    await this.prisma.$transaction([
      this.prisma.expense.deleteMany({ where: { userId } }),
      this.prisma.budget.deleteMany({ where: { userId } }),
      this.prisma.inventoryItem.deleteMany({ where: { userId } }),
      this.prisma.notification.deleteMany({ where: { userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);

    return {
      success: true,
      message: 'Compte supprimé avec succès',
    };
  }
}
