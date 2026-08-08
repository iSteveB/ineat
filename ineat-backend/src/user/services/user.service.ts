import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
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
import { BillingService } from '../../billing/billing.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { EmailService } from '../../email/email.service';
import {
  DELETE_ACCOUNT_CONFIRMATION,
  DeleteAccountDto,
} from '../dto/delete-account.dto';

interface UpdatePersonalInfoDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  defaultServings?: number;
  primaryGoal?: PrimaryGoal | null;
  completeProfileOnboarding?: boolean;
}

const PRIMARY_GOALS = new Set<string>(Object.values(PrimaryGoal));

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    private accessPolicyService: AccessPolicyService,
    private usageQuotaService: UsageQuotaService,
    private billingService: BillingService,
    private cloudinaryService: CloudinaryService,
    private emailService: EmailService,
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
        ...(updateData.completeProfileOnboarding === true && {
          profileOnboardingCompletedAt: new Date(),
        }),
      },
    });

    return {
      success: true,
      data: {
        ...(await toSafeUserResponseWithUsage(
          updatedUser as any,
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

    return {
      success: true,
      data: {
        ...(await toSafeUserResponseWithUsage(
          user as any,
          this.accessPolicyService,
          this.usageQuotaService,
        )),
      },
    };
  }

  async getProfileInsights(userId: string, now = new Date()) {
    const startMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1),
    );
    const endMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );

    const [savedRecipes, completedRecipes, expenses] = await Promise.all([
      this.prisma.recipe.count({ where: { userId } }),
      this.prisma.recipe.count({
        where: { userId, doneAt: { not: null } },
      }),
      this.prisma.expense.findMany({
        where: {
          userId,
          date: { gte: startMonth, lt: endMonth },
        },
        select: { amount: true, date: true },
      }),
    ]);

    const totalsByMonth = new Map<string, number>();
    for (const expense of expenses) {
      const key = `${expense.date.getUTCFullYear()}-${String(
        expense.date.getUTCMonth() + 1,
      ).padStart(2, '0')}`;
      totalsByMonth.set(key, (totalsByMonth.get(key) ?? 0) + expense.amount);
    }

    const spendingTrend = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(
        Date.UTC(
          startMonth.getUTCFullYear(),
          startMonth.getUTCMonth() + index,
          1,
        ),
      );
      const month = `${date.getUTCFullYear()}-${String(
        date.getUTCMonth() + 1,
      ).padStart(2, '0')}`;

      return {
        month,
        total:
          Math.round(((totalsByMonth.get(month) ?? 0) + Number.EPSILON) * 100) /
          100,
      };
    });

    return {
      success: true,
      data: {
        recipes: {
          saved: savedRecipes,
          completed: completedRecipes,
        },
        spendingTrend,
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

  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    if (dto.confirmation !== DELETE_ACCOUNT_CONFIRMATION) {
      throw new BadRequestException('La phrase de confirmation est incorrecte');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        avatarUrl: true,
        stripeSubscriptionId: true,
        Invoice: { select: { pdfUrl: true } },
        Receipt: { select: { imageUrl: true, pdfUrl: true } },
        Recipe: { select: { imageUrl: true } },
      },
    });

    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    await this.billingService.cancelSubscriptionImmediately(
      existingUser.stripeSubscriptionId,
    );

    await Promise.all([
      this.cloudinaryService.deleteResourceFromUrl(
        existingUser.avatarUrl,
        'image',
      ),
      ...existingUser.Invoice.map((invoice) =>
        this.cloudinaryService.deleteResourceFromUrl(invoice.pdfUrl, 'raw'),
      ),
      ...existingUser.Receipt.flatMap((receipt) => [
        this.cloudinaryService.deleteResourceFromUrl(receipt.imageUrl, 'image'),
        this.cloudinaryService.deleteResourceFromUrl(receipt.pdfUrl, 'raw'),
      ]),
      ...existingUser.Recipe.map((recipe) =>
        this.cloudinaryService.deleteResourceFromUrl(recipe.imageUrl, 'image'),
      ),
    ]);

    await this.prisma.$transaction([
      this.prisma.expense.deleteMany({ where: { userId } }),
      this.prisma.budget.deleteMany({ where: { userId } }),
      this.prisma.inventoryItem.deleteMany({ where: { userId } }),
      this.prisma.notification.deleteMany({ where: { userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);

    try {
      await this.emailService.sendAccountDeleted({
        to: existingUser.email,
        userId: existingUser.id,
        firstName: existingUser.firstName,
      });
    } catch (error) {
      this.logger.warn(
        `Account deletion email failed for ${userId}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }

    return {
      success: true,
      message: 'Compte supprimé avec succès',
    };
  }
}
