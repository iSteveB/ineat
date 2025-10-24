/**
 * Service Receipt
 *
 * Service principal pour la gestion des receipts (tickets de caisse et factures drive)
 * Orchestre l'upload, le traitement OCR, la validation et l'ajout à l'inventaire
 *
 * @module receipt/services/receipt.service
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OcrService } from './ocr.service';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import {
  DocumentType,
  OcrProcessingResult,
} from '../interfaces/ocr-provider.interface';
import {
  ReceiptStatus,
  DocumentType as PrismaDocumentType,
} from '@prisma/client';

/**
 * Mapper notre enum DocumentType vers l'enum Prisma
 */
function mapDocumentTypeToPrisma(type: DocumentType): PrismaDocumentType {
  switch (type) {
    case DocumentType.RECEIPT_IMAGE:
      return PrismaDocumentType.RECEIPT_IMAGE;
    case DocumentType.INVOICE_PDF:
      return PrismaDocumentType.INVOICE_PDF;
    case DocumentType.INVOICE_HTML:
      return PrismaDocumentType.INVOICE_HTML;
    default:
      throw new BadRequestException(`Type de document invalide: ${type}`);
  }
}

/**
 * DTO pour créer un receipt
 */
export interface CreateReceiptDto {
  userId: string;
  documentType: DocumentType;
  fileBuffer: Buffer;
  fileName: string;
  merchantName?: string;
  merchantAddress?: string;
}

/**
 * Service de gestion des receipts
 *
 * Workflow complet :
 * 1. Upload fichier → Cloudinary
 * 2. Créer receipt en DB (status: PROCESSING)
 * 3. Traiter avec OCR (async)
 * 4. Mettre à jour receipt avec résultats
 * 5. Permettre validation utilisateur
 * 6. Ajouter à l'inventaire
 *
 * @example
 * ```typescript
 * const receipt = await receiptService.createReceipt({
 *   userId: 'user-123',
 *   documentType: DocumentType.RECEIPT_IMAGE,
 *   fileBuffer: imageBuffer,
 *   fileName: 'ticket.jpg',
 * });
 * ```
 */
@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);

  constructor(
    private prisma: PrismaService,
    private ocrService: OcrService,
    private cloudinaryStorage: CloudinaryStorageService,
  ) {}

  /**
   * Créer un nouveau receipt et lancer le traitement OCR
   *
   * @param dto - Données de création
   * @returns Receipt créé avec status PROCESSING
   */
  async createReceipt(dto: CreateReceiptDto) {
    this.logger.log(
      `Création receipt pour user ${dto.userId}, type: ${dto.documentType}`,
    );

    try {
      // 1. Uploader le fichier sur Cloudinary
      this.logger.debug('Upload sur Cloudinary...');
      const uploadResult = await this.cloudinaryStorage.uploadReceipt(
        dto.fileBuffer,
        dto.userId,
        dto.documentType,
      );

      // 2. Créer le receipt en DB avec status PROCESSING
      const receipt = await this.prisma.receipt.create({
        data: {
          userId: dto.userId,
          documentType: mapDocumentTypeToPrisma(dto.documentType), // ← Mapper ici
          status: ReceiptStatus.PROCESSING,
          imageUrl:
            dto.documentType === DocumentType.RECEIPT_IMAGE
              ? uploadResult.secureUrl
              : null,
          pdfUrl:
            dto.documentType !== DocumentType.RECEIPT_IMAGE
              ? uploadResult.secureUrl
              : null,
          merchantName: dto.merchantName,
          merchantAddress: dto.merchantAddress,
        },
      });

      this.logger.log(`✓ Receipt créé: ${receipt.id}`);

      // 3. Lancer le traitement OCR en arrière-plan
      // Note: Pour l'instant on fait en synchrone,
      // plus tard on utilisera une queue (Bull) pour async
      this.processReceiptOcr(
        receipt.id,
        dto.fileBuffer,
        dto.documentType,
      ).catch((error) => {
        this.logger.error(
          `Erreur traitement OCR receipt ${receipt.id}: ${error.message}`,
        );
      });

      return receipt;
    } catch (error) {
      this.logger.error(`Erreur création receipt: ${error.message}`);
      throw error;
    }
  }

  /**
   * Traiter un receipt avec OCR (appelé en async)
   *
   * @param receiptId - ID du receipt
   * @param fileBuffer - Buffer du fichier
   * @param documentType - Type de document
   */
  private async processReceiptOcr(
    receiptId: string,
    fileBuffer: Buffer,
    documentType: DocumentType,
  ): Promise<void> {
    this.logger.log(`Traitement OCR receipt ${receiptId}...`);
    const startTime = Date.now();

    try {
      // Traiter avec OCR
      const ocrResult = await this.ocrService.processDocument(
        fileBuffer,
        documentType,
      );

      const processingTime = Date.now() - startTime;

      if (ocrResult.success && ocrResult.data) {
        // Succès : mettre à jour avec les données extraites
        await this.updateReceiptWithOcrResult(receiptId, ocrResult);
        this.logger.log(
          `✓ OCR réussi pour receipt ${receiptId} en ${processingTime}ms`,
        );
      } else {
        // Échec : marquer comme FAILED
        await this.prisma.receipt.update({
          where: { id: receiptId },
          data: {
            status: ReceiptStatus.FAILED,
            errorMessage: ocrResult.error || 'Erreur OCR inconnue',
            processingTime,
          },
        });
        this.logger.warn(`✗ OCR échoué pour receipt ${receiptId}`);
      }
    } catch (error) {
      // Exception : marquer comme FAILED
      await this.prisma.receipt.update({
        where: { id: receiptId },
        data: {
          status: ReceiptStatus.FAILED,
          errorMessage: error.message,
          processingTime: Date.now() - startTime,
        },
      });
      this.logger.error(`Exception OCR receipt ${receiptId}: ${error.message}`);
    }
  }

  /**
   * Mettre à jour le receipt avec les résultats OCR
   */
  private async updateReceiptWithOcrResult(
    receiptId: string,
    ocrResult: OcrProcessingResult,
  ) {
    const data = ocrResult.data;

    // Mettre à jour le receipt
    await this.prisma.receipt.update({
      where: { id: receiptId },
      data: {
        status: ReceiptStatus.COMPLETED,
        merchantName: data.merchantName,
        totalAmount: data.totalAmount,
        purchaseDate: data.purchaseDate,
        invoiceNumber: data.invoiceNumber,
        orderNumber: data.orderNumber,
        ocrProvider: ocrResult.provider,
        ocrConfidence: data.confidence,
        processingTime: ocrResult.processingTime,
        rawOcrData: data.rawData || {},
      },
    });

    // Créer les items détectés
    if (data.lineItems && data.lineItems.length > 0) {
      await this.prisma.receiptItem.createMany({
        data: data.lineItems.map((item) => ({
          receiptId,
          detectedName: item.description,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          confidence: item.confidence,
          productCode: item.productCode,
          category: item.category,
          discount: item.discount,
        })),
      });
    }
  }

  /**
   * Récupérer un receipt par ID
   *
   * @param id - ID du receipt
   * @param userId - ID de l'utilisateur (pour vérifier les droits)
   * @returns Receipt avec ses items
   */
  async getReceiptById(id: string, userId: string) {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true, // Inclure le produit associé si existant
          },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException(`Receipt ${id} non trouvé`);
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (receipt.userId !== userId) {
      throw new ForbiddenException("Vous n'avez pas accès à ce receipt");
    }

    return receipt;
  }

  /**
   * Récupérer tous les receipts d'un utilisateur
   *
   * @param userId - ID de l'utilisateur
   * @param filters - Filtres optionnels (status, documentType)
   * @returns Liste des receipts
   */
  async getUserReceipts(
    userId: string,
    filters?: {
      status?: ReceiptStatus;
      documentType?: DocumentType;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = { userId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.documentType) {
      where.documentType = mapDocumentTypeToPrisma(filters.documentType); // ← Mapper ici aussi
    }

    const receipts = await this.prisma.receipt.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });

    return receipts;
  }

  /**
   * Mettre à jour un item de receipt (correction utilisateur)
   *
   * @param receiptId - ID du receipt
   * @param itemId - ID de l'item
   * @param userId - ID de l'utilisateur
   * @param updates - Modifications à appliquer
   */
  async updateReceiptItem(
    receiptId: string,
    itemId: string,
    userId: string,
    updates: {
      detectedName?: string;
      quantity?: number;
      unitPrice?: number;
      productId?: string;
      validated?: boolean;
    },
  ) {
    // Vérifier que le receipt appartient à l'utilisateur
    const receipt = await this.getReceiptById(receiptId, userId);

    // Vérifier que l'item existe
    const item = receipt.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException(`Item ${itemId} non trouvé`);
    }

    // Mettre à jour l'item
    const updatedItem = await this.prisma.receiptItem.update({
      where: { id: itemId },
      data: updates,
    });

    this.logger.log(`✓ Item ${itemId} mis à jour`);
    return updatedItem;
  }

  /**
   * Valider un receipt (marquer comme prêt pour ajout inventaire)
   *
   * @param receiptId - ID du receipt
   * @param userId - ID de l'utilisateur
   */
  async validateReceipt(receiptId: string, userId: string) {
    const receipt = await this.getReceiptById(receiptId, userId);

    if (receipt.status !== ReceiptStatus.COMPLETED) {
      throw new BadRequestException(
        'Le receipt doit être en statut COMPLETED pour être validé',
      );
    }

    const validatedReceipt = await this.prisma.receipt.update({
      where: { id: receiptId },
      data: {
        status: ReceiptStatus.VALIDATED,
      },
    });

    this.logger.log(`✓ Receipt ${receiptId} validé`);
    return validatedReceipt;
  }

  /**
   * Supprimer un receipt
   *
   * @param receiptId - ID du receipt
   * @param userId - ID de l'utilisateur
   */
  async deleteReceipt(receiptId: string, userId: string) {
    const receipt = await this.getReceiptById(receiptId, userId);

    // Supprimer le fichier de Cloudinary
    // Extraire le publicId depuis l'URL
    const url = receipt.imageUrl || receipt.pdfUrl;
    if (url) {
      const publicId = this.extractPublicIdFromUrl(url);
      await this.cloudinaryStorage.deleteReceipt(publicId);
    }

    // Supprimer le receipt de la DB (cascade sur les items)
    await this.prisma.receipt.delete({
      where: { id: receiptId },
    });

    this.logger.log(`✓ Receipt ${receiptId} supprimé`);
    return { success: true };
  }

  /**
   * Extraire le publicId Cloudinary depuis une URL
   */
  private extractPublicIdFromUrl(url: string): string {
    // URL format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{publicId}.{format}
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex !== -1 && uploadIndex + 2 < parts.length) {
      // Récupérer tout après 'upload/v{version}/'
      const pathAfterVersion = parts.slice(uploadIndex + 2).join('/');
      // Retirer l'extension
      return pathAfterVersion.replace(/\.[^.]+$/, '');
    }
    return '';
  }

  /**
   * Obtenir les statistiques des receipts d'un utilisateur
   *
   * @param userId - ID de l'utilisateur
   */
  async getReceiptStats(userId: string) {
    const [total, processing, completed, failed, validated] = await Promise.all(
      [
        this.prisma.receipt.count({ where: { userId } }),
        this.prisma.receipt.count({
          where: { userId, status: ReceiptStatus.PROCESSING },
        }),
        this.prisma.receipt.count({
          where: { userId, status: ReceiptStatus.COMPLETED },
        }),
        this.prisma.receipt.count({
          where: { userId, status: ReceiptStatus.FAILED },
        }),
        this.prisma.receipt.count({
          where: { userId, status: ReceiptStatus.VALIDATED },
        }),
      ],
    );

    return {
      total,
      processing,
      completed,
      failed,
      validated,
    };
  }
}
