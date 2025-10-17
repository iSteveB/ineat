/**
 * Service de stockage Cloudinary pour les receipts
 * 
 * Gère l'upload, la récupération et la suppression des images/PDF de receipts
 * sur Cloudinary, avec optimisation et transformation automatique
 * 
 * @module receipt/services/cloudinary-storage.service
 */

import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { DocumentType } from '../interfaces/ocr-provider.interface';

/**
 * Configuration Cloudinary pour les receipts
 */
interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * Résultat d'un upload sur Cloudinary
 */
export interface CloudinaryUploadResult {
  url: string;           // URL publique du fichier
  secureUrl: string;     // URL HTTPS du fichier
  publicId: string;      // ID Cloudinary du fichier
  format: string;        // Format du fichier (jpg, png, pdf)
  resourceType: string;  // Type de ressource (image, raw)
  bytes: number;         // Taille en bytes
  width?: number;        // Largeur (images uniquement)
  height?: number;       // Hauteur (images uniquement)
}

/**
 * Service de stockage sur Cloudinary spécifique aux receipts
 * 
 * Ce service gère :
 * - Upload d'images de tickets (JPEG, PNG, HEIC)
 * - Upload de PDF de factures drive
 * - Optimisation automatique des images
 * - Compression pour réduire les coûts
 * - Suppression des anciens fichiers
 * 
 * @example
 * ```typescript
 * const result = await cloudinaryStorage.uploadReceipt(
 *   buffer,
 *   'user-123',
 *   DocumentType.RECEIPT_IMAGE
 * );
 * console.log('URL:', result.secureUrl);
 * ```
 */
@Injectable()
export class CloudinaryStorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);
  private readonly receiptFolder = 'receipts'; // Dossier dans Cloudinary

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

    this.logger.log(
      `Cloudinary initialisé (cloud: ${config.cloudName}, folder: ${this.receiptFolder})`,
    );
  }

  /**
   * Récupérer la configuration Cloudinary depuis les variables d'environnement
   */
  private getCloudinaryConfig(): CloudinaryConfig {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException(
        'Configuration Cloudinary manquante (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)',
      );
    }

    return { cloudName, apiKey, apiSecret };
  }

  /**
   * Uploader un receipt (image ou PDF) sur Cloudinary
   * 
   * @param buffer - Buffer du fichier
   * @param userId - ID de l'utilisateur
   * @param documentType - Type de document
   * @returns Résultat de l'upload
   * 
   * @throws InternalServerErrorException si l'upload échoue
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
      // Déterminer le type de ressource
      const isPdf = documentType !== DocumentType.RECEIPT_IMAGE;
      const resourceType = isPdf ? 'raw' : 'image';

      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const publicId = `${this.receiptFolder}/${userId}/${timestamp}`;

      // Options d'upload selon le type
      const uploadOptions = isPdf
        ? this.getPdfUploadOptions(publicId)
        : this.getImageUploadOptions(publicId);

      // Uploader sur Cloudinary
      const result = await this.uploadToCloudinary(buffer, uploadOptions);

      this.logger.log(
        `✓ Upload réussi: ${result.secureUrl} (${result.bytes} bytes)`,
      );

      return this.mapCloudinaryResult(result);
    } catch (error) {
      this.logger.error(
        `Échec upload receipt: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Échec de l'upload sur Cloudinary: ${error.message}`,
      );
    }
  }

  /**
   * Options d'upload pour les images
   */
  private getImageUploadOptions(publicId: string): any {
    return {
      public_id: publicId,
      resource_type: 'image',
      folder: this.receiptFolder,
      // Optimisations pour les receipts
      transformation: [
        {
          quality: 'auto:good', // Compression automatique
          fetch_format: 'auto', // Format optimal (WebP si supporté)
        },
      ],
      // Limites de taille
      eager: [
        {
          width: 1500,
          height: 2000,
          crop: 'limit', // Ne pas agrandir, seulement réduire si trop grand
          quality: 'auto:good',
        },
      ],
      // Tags pour organisation
      tags: ['receipt', 'ocr'],
    };
  }

  /**
   * Options d'upload pour les PDF
   */
  private getPdfUploadOptions(publicId: string): any {
    return {
      public_id: publicId,
      resource_type: 'raw', // PDF = raw
      folder: this.receiptFolder,
      tags: ['receipt', 'invoice', 'pdf'],
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

      // Écrire le buffer dans le stream
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
   * 
   * @param publicId - Public ID Cloudinary du fichier
   * @returns true si suppression réussie
   */
  async deleteReceipt(publicId: string): Promise<boolean> {
    this.logger.log(`Suppression receipt: ${publicId}`);

    try {
      // Déterminer le type de ressource depuis le publicId
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
   * Utile lors de la suppression de compte
   * 
   * @param userId - ID de l'utilisateur
   * @returns Nombre de fichiers supprimés
   */
  async deleteUserReceipts(userId: string): Promise<number> {
    this.logger.log(`Suppression de tous les receipts de l'user ${userId}`);

    try {
      // Rechercher tous les fichiers dans le dossier de l'utilisateur
      const prefix = `${this.receiptFolder}/${userId}`;

      // Supprimer les images
      const imageResult = await cloudinary.api.delete_resources_by_prefix(
        prefix,
        { resource_type: 'image' },
      );

      // Supprimer les PDFs (raw)
      const pdfResult = await cloudinary.api.delete_resources_by_prefix(
        prefix,
        { resource_type: 'raw' },
      );

      const totalDeleted =
        Object.keys(imageResult.deleted || {}).length +
        Object.keys(pdfResult.deleted || {}).length;

      this.logger.log(`✓ ${totalDeleted} receipts supprimés pour l'user ${userId}`);
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
   * Nettoyer les anciens receipts (> 30 jours en statut PROCESSING/FAILED)
   * À appeler via un CRON job
   * 
   * @param olderThanDays - Supprimer les fichiers plus vieux que X jours
   * @returns Nombre de fichiers supprimés
   */
  async cleanupOldReceipts(olderThanDays: number = 30): Promise<number> {
    this.logger.log(
      `Nettoyage des receipts plus vieux que ${olderThanDays} jours`,
    );

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Note: Cette méthode nécessite une liste des publicIds
      // depuis la base de données (receipts en statut PROCESSING/FAILED)
      // L'implémentation complète se fera dans le ReceiptService

      this.logger.log('Nettoyage à implémenter avec la base de données');
      return 0;
    } catch (error) {
      this.logger.error(
        `Erreur nettoyage receipts: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Obtenir les informations d'un fichier sur Cloudinary
   * 
   * @param publicId - Public ID Cloudinary
   * @returns Informations du fichier ou null si non trouvé
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