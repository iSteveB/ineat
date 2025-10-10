import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import {
  UpdateAvatarDto,
  CloudinaryUploadParamsDto,
} from './dto/update-avatar.dto';

@Injectable()
export class AvatarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Génère les paramètres pour un upload sécurisé côté client
   * @param userId - ID de l'utilisateur
   * @returns Paramètres pour l'upload Cloudinary
   */
  async generateAvatarUploadSignature(
    userId: string,
  ): Promise<CloudinaryUploadParamsDto> {
    // Vérifier que l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Retourner les paramètres pour l'upload avec preset
    return this.cloudinaryService.generateUploadParams(`avatars/${userId}`);
  }

  /**
   * Met à jour l'URL de l'avatar de l'utilisateur
   * @param userId - ID de l'utilisateur
   * @param updateAvatarDto - DTO contenant l'URL du nouvel avatar
   * @returns Utilisateur mis à jour sans le mot de passe
   */
  async updateAvatar(
    userId: string,
    updateAvatarDto: UpdateAvatarDto,
  ): Promise<{
    id: string;
    avatarUrl: string;
    message: string;
  }> {
    const { avatarUrl } = updateAvatarDto;

    // Vérifier que l'utilisateur existe et récupérer son ancien avatar
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, avatarUrl: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Valider que l'URL provient bien de Cloudinary
    if (!avatarUrl.includes('cloudinary.com')) {
      throw new BadRequestException("L'URL doit provenir de Cloudinary");
    }

    // Si l'utilisateur avait déjà un avatar, le supprimer de Cloudinary
    if (user.avatarUrl && user.avatarUrl !== avatarUrl) {
      try {
        const publicId = this.cloudinaryService.extractPublicId(user.avatarUrl);
        await this.cloudinaryService.deleteImage(publicId);
      } catch (error) {
        // Si la suppression échoue, on continue quand même (l'ancien avatar reste sur Cloudinary)
        console.warn(
          `Impossible de supprimer l'ancien avatar: ${error.message}`,
        );
      }
    }

    // Mettre à jour l'URL de l'avatar dans la base de données
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });

    return {
      id: updatedUser.id,
      avatarUrl: updatedUser.avatarUrl as string,
      message: 'Avatar mis à jour avec succès',
    };
  }

  /**
   * Supprime l'avatar de l'utilisateur
   * @param userId - ID de l'utilisateur
   * @returns Message de confirmation
   */
  async deleteAvatar(userId: string): Promise<{ message: string }> {
    // Vérifier que l'utilisateur existe et récupérer son avatar
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, avatarUrl: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (!user.avatarUrl) {
      throw new BadRequestException("L'utilisateur n'a pas d'avatar");
    }

    // Supprimer l'image de Cloudinary
    try {
      const publicId = this.cloudinaryService.extractPublicId(user.avatarUrl);
      await this.cloudinaryService.deleteImage(publicId);
    } catch (error) {
      throw new BadRequestException(
        `Erreur lors de la suppression de l'avatar: ${error.message}`,
      );
    }

    // Mettre à jour la base de données pour retirer l'URL
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });

    return {
      message: 'Avatar supprimé avec succès',
    };
  }

  /**
   * Récupère l'URL de l'avatar avec transformations optimisées
   * @param userId - ID de l'utilisateur
   * @param size - Taille du cercle (défaut: 150)
   * @returns URL de l'avatar optimisé ou null
   */
  async getOptimizedAvatarUrl(
    userId: string,
    size: number = 150,
  ): Promise<{ avatarUrl: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (!user.avatarUrl) {
      return { avatarUrl: null };
    }

    // Générer une URL optimisée pour l'avatar
    const publicId = this.cloudinaryService.extractPublicId(user.avatarUrl);
    const optimizedUrl = this.cloudinaryService.getAvatarUrl(publicId, size);

    return { avatarUrl: optimizedUrl };
  }
}
