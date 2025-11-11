/**
 * Service de stockage Cloudinary pour les receipts
 * VERSION CORRIGÉE : Utilise un upload preset pour éviter les erreurs de signature
 *
 * @module receipt/services/cloudinary-storage.service
 */

import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import { DocumentType } from '../interfaces/ocr-provider.interface';

/**
 * Configuration Cloudinary pour les receipts
 */
interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  receiptPreset?: string; // Upload preset pour receipts
}

/**
 * Résultat d'un upload sur Cloudinary
 */
export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  resourceType: string;
  bytes: number;
  width?: number;
  height?: number;
}

/**
 * Service de stockage sur Cloudinary spécifique aux receipts
 *
 * CHANGEMENT : Utilise maintenant un upload preset pour éviter les problèmes de signature
 */
@Injectable()
export class CloudinaryStorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);
  private readonly receiptFolder = 'receipts';
  private receiptPreset?: string; // Retiré readonly pour pouvoir l'assigner

  constructor(private configService: ConfigService) {
    this.initializeCloudinary();
  }

  /**
   * Initialiser la configuration Cloudinary
   */
  private initializeCloudinary(): void {
    const config = this.getCloudinaryConfig();

    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    });

    this.receiptPreset = config.receiptPreset;

    this.logger.log(
      `Cloudinary initialisé (cloud: ${config.cloudName}, folder: ${this.receiptFolder}, preset: ${this.receiptPreset || 'none'})`,
    );
  }

  /**
   * Récupérer la configuration Cloudinary depuis les variables d'environnement
   */
  private getCloudinaryConfig(): CloudinaryConfig {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    const receiptPreset = this.configService.get<string>(
      'CLOUDINARY_RECEIPT_PRESET',
    );

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException(
        'Configuration Cloudinary manquante (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)',
      );
    }

    return { cloudName, apiKey, apiSecret, receiptPreset };
  }

  /**
   * Uploader un receipt (image ou PDF) sur Cloudinary
   *
   * @param buffer - Buffer du fichier
   * @param userId - ID de l'utilisateur
   * @param documentType - Type de document
   * @returns Résultat de l'upload
   */
  async uploadReceipt(
    buffer: Buffer,
    userId: string,
    documentType: DocumentType,
  ): Promise<CloudinaryUploadResult> {
    this.logger.log(
      `Upload receipt pour user ${userId}, type: ${documentType}, taille: ${buffer.length} bytes`,
    );

    try {
      const isPdf = documentType !== DocumentType.RECEIPT_IMAGE;
      const resourceType = isPdf ? 'raw' : 'image';
      const timestamp = Date.now();
      const publicId = `${this.receiptFolder}/${userId}/${timestamp}`;

      // Utiliser le preset si disponible (recommandé), sinon options simples
      const uploadOptions = this.receiptPreset
        ? this.getPresetUploadOptions(publicId, isPdf)
        : this.getSimpleUploadOptions(publicId, isPdf);

      const result = await this.uploadToCloudinary(buffer, uploadOptions);

      this.logger.log(
        `✓ Upload réussi: ${result.secureUrl} (${result.bytes} bytes)`,
      );

      return this.mapCloudinaryResult(result);
    } catch (error) {
      this.logger.error(`Échec upload receipt: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Échec de l'upload sur Cloudinary: ${error.message}`,
      );
    }
  }

  /**
   * Options d'upload avec preset (méthode recommandée)
   * Évite les problèmes de signature en utilisant un preset configuré dans Cloudinary
   */
  private getPresetUploadOptions(publicId: string, isPdf: boolean): any {
    this.logger.debug(`Upload avec preset: ${this.receiptPreset}`);

    if (isPdf) {
      return {
        upload_preset: this.receiptPreset,
        public_id: publicId,
        resource_type: 'raw',
        folder: this.receiptFolder,
      };
    }

    return {
      upload_preset: this.receiptPreset,
      public_id: publicId,
      resource_type: 'image',
      folder: this.receiptFolder,
      // Le preset contient déjà les transformations
    };
  }

  /**
   * Options d'upload simples (fallback sans preset)
   * Évite les transformations complexes qui nécessitent des signatures
   */
  private getSimpleUploadOptions(publicId: string, isPdf: boolean): any {
    this.logger.debug('Upload sans preset - options simples');

    if (isPdf) {
      return {
        public_id: publicId,
        resource_type: 'raw',
        folder: this.receiptFolder,
        tags: ['receipt', 'invoice', 'pdf'],
      };
    }

    // Pour les images : options minimales pour éviter les erreurs de signature
    return {
      public_id: publicId,
      resource_type: 'image',
      folder: this.receiptFolder,
      tags: ['receipt', 'ocr'],
      // Transformations basiques qui ne nécessitent pas de signature
      quality: 'auto',
      fetch_format: 'auto',
    };
  }

  /**
   * Uploader sur Cloudinary via stream
   */
  private uploadToCloudinary(
    buffer: Buffer,
    options: any,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        },
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Mapper le résultat Cloudinary vers notre format
   */
  private mapCloudinaryResult(
    result: UploadApiResponse,
  ): CloudinaryUploadResult {
    return {
      url: result.url,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    };
  }

  /**
   * Supprimer un receipt de Cloudinary
   */
  async deleteReceipt(publicId: string): Promise<boolean> {
    this.logger.log(`Suppression receipt: ${publicId}`);

    try {
      const resourceType = publicId.includes('.pdf') ? 'raw' : 'image';

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });

      if (result.result === 'ok') {
        this.logger.log(`✓ Receipt supprimé: ${publicId}`);
        return true;
      } else {
        this.logger.warn(
          `Suppression receipt échouée: ${publicId} (${result.result})`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Erreur suppression receipt: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Supprimer tous les receipts d'un utilisateur
   */
  async deleteUserReceipts(userId: string): Promise<number> {
    this.logger.log(`Suppression de tous les receipts de l'user ${userId}`);

    try {
      const prefix = `${this.receiptFolder}/${userId}`;

      const imageResult = await cloudinary.api.delete_resources_by_prefix(
        prefix,
        { resource_type: 'image' },
      );

      const pdfResult = await cloudinary.api.delete_resources_by_prefix(
        prefix,
        { resource_type: 'raw' },
      );

      const totalDeleted =
        Object.keys(imageResult.deleted || {}).length +
        Object.keys(pdfResult.deleted || {}).length;

      this.logger.log(
        `✓ ${totalDeleted} receipts supprimés pour l'user ${userId}`,
      );
      return totalDeleted;
    } catch (error) {
      this.logger.error(
        `Erreur suppression receipts user: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Obtenir les informations d'un fichier sur Cloudinary
   */
  async getReceiptInfo(publicId: string): Promise<any | null> {
    try {
      const resourceType = publicId.includes('.pdf') ? 'raw' : 'image';
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
      });
      return result;
    } catch (error) {
      if (error.error?.http_code === 404) {
        return null;
      }
      throw error;
    }
  }
}
