import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { CLOUDINARY } from './cloudinary.provider';

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject(CLOUDINARY) private readonly cloudinary: typeof import('cloudinary').v2,
  ) {}

  /**
   * Génère une signature pour un upload sécurisé côté client
   * @param folder - Dossier de destination dans Cloudinary (ex: 'avatars', 'recipes')
   * @returns Objet contenant la signature et les paramètres nécessaires
   */
  generateUploadSignature(folder: string): {
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    folder: string;
  } {
    const timestamp = Math.round(Date.now() / 1000);
    const params = {
      timestamp,
      folder,
    };

    const signature = this.cloudinary.utils.api_sign_request(
      params,
      this.cloudinary.config().api_secret as string,
    );

    return {
      signature,
      timestamp,
      cloudName: this.cloudinary.config().cloud_name as string,
      apiKey: this.cloudinary.config().api_key as string,
      folder,
    };
  }

  /**
   * Upload une image depuis un buffer (utilisation côté serveur)
   * @param file - Buffer du fichier
   * @param folder - Dossier de destination
   * @param publicId - ID public optionnel pour l'image
   * @returns URL de l'image uploadée
   */
  async uploadImage(
    file: Buffer,
    folder: string,
    publicId?: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder,
        resource_type: 'image' as const,
        public_id: publicId,
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      };

      this.cloudinary.uploader
        .upload_stream(
          uploadOptions,
          (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
            if (error) {
              reject(
                new BadRequestException(
                  `Erreur lors de l'upload de l'image: ${error.message}`,
                ),
              );
            }
            if (result) {
              resolve(result.secure_url);
            }
          },
        )
        .end(file);
    });
  }

  /**
   * Supprime une image de Cloudinary
   * @param publicId - ID public de l'image (ex: 'avatars/user_123')
   * @returns Résultat de la suppression
   */
  async deleteImage(publicId: string): Promise<{ result: string }> {
    try {
      const result = await this.cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      throw new BadRequestException(
        `Erreur lors de la suppression de l'image: ${error.message}`,
      );
    }
  }

  /**
   * Extrait le public_id d'une URL Cloudinary
   * @param url - URL complète de l'image Cloudinary
   * @returns Public ID (ex: 'avatars/user_123')
   */
  extractPublicId(url: string): string {
    // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
    if (!matches || !matches[1]) {
      throw new BadRequestException('URL Cloudinary invalide');
    }
    return matches[1];
  }

  /**
   * Génère une URL transformée pour une image
   * @param publicId - ID public de l'image
   * @param transformations - Transformations à appliquer (width, height, crop, etc.)
   * @returns URL transformée
   */
  getTransformedUrl(
    publicId: string,
    transformations: Record<string, string | number>,
  ): string {
    return this.cloudinary.url(publicId, {
      ...transformations,
      secure: true,
    });
  }

  /**
   * Génère une URL pour un avatar avec transformations prédéfinies
   * @param publicId - ID public de l'avatar
   * @param size - Taille du cercle (défaut: 150)
   * @returns URL de l'avatar optimisé
   */
  getAvatarUrl(publicId: string, size: number = 150): string {
    return this.cloudinary.url(publicId, {
      width: size,
      height: size,
      crop: 'fill',
      gravity: 'face',
      radius: 'max',
      quality: 'auto',
      fetch_format: 'auto',
      secure: true,
    });
  }
}