/**
 * Service Receipt
 *
 * Service principal pour la gestion des receipts (tickets de caisse et factures drive)
 * Orchestre l'upload, le traitement OCR, l'analyse LLM, la validation et l'ajout à l'inventaire
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
import { LlmService, LlmReceiptAnalysis } from './llm.service';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import {
  DocumentType,
  OcrProcessingResult,
} from '../interfaces/ocr-provider.interface';
import {
  ReceiptStatus,
  DocumentType as PrismaDocumentType,
  Prisma,
} from '../../../prisma/generated/prisma/client';
import { randomUUID } from 'crypto';

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
 * 3. Traiter avec OCR Tesseract (extraction texte brut)
 * 4. Analyser avec LLM (suggestions EAN vérifiées)
 * 5. Mettre à jour receipt avec résultats
 * 6. Permettre validation utilisateur (Phase 1 / Phase 2)
 * 7. Ajouter à l'inventaire
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
    private readonly prisma: PrismaService,
    private readonly ocrService: OcrService,
    private readonly llmService: LlmService,
    private readonly cloudinaryStorage: CloudinaryStorageService,
  ) {}

  /**
   * Créer un nouveau receipt et lancer le traitement OCR + LLM
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
          id: randomUUID(),
          userId: dto.userId,
          documentType: mapDocumentTypeToPrisma(dto.documentType),
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
          updatedAt: new Date(),
        },
      });

      this.logger.log(`✓ Receipt créé: ${receipt.id}`);

      // 3. Lancer le traitement OCR + LLM en arrière-plan
      // Note: Pour l'instant on fait en synchrone,
      // plus tard on utilisera une queue (Bull) pour async
      this.processReceiptOcrAndLlm(
        receipt.id,
        dto.fileBuffer,
        dto.documentType,
      ).catch((error) => {
        this.logger.error(
          `Erreur traitement receipt ${receipt.id}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        );
      });

      return receipt;
    } catch (error) {
      this.logger.error(
        `Erreur création receipt: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      );
      throw error;
    }
  }

  /**
   * Traiter un receipt avec OCR puis LLM (appelé en async)
   *
   * Pipeline :
   * 1. Tesseract OCR → Texte brut
   * 2. LLM Analysis → Produits avec suggestions EAN vérifiées
   * 3. Sauvegarde en DB
   *
   * @param receiptId - ID du receipt
   * @param fileBuffer - Buffer du fichier
   * @param documentType - Type de document
   */
  private async processReceiptOcrAndLlm(
    receiptId: string,
    fileBuffer: Buffer,
    documentType: DocumentType,
  ): Promise<void> {
    this.logger.log(`Traitement OCR + LLM receipt ${receiptId}...`);
    const startTime = Date.now();

    try {
      // === ÉTAPE 1 : OCR avec Tesseract ===
      this.logger.debug(`[${receiptId}] Étape 1: OCR Tesseract...`);
      const ocrResult = await this.ocrService.processDocument(
        fileBuffer,
        documentType,
      );

      if (!ocrResult.success || !ocrResult.data) {
        throw new Error(ocrResult.error || 'Erreur OCR inconnue');
      }

      const ocrText = this.extractTextFromOcrResult(ocrResult);
      this.logger.debug(
        `[${receiptId}] OCR terminé: ${ocrText.length} caractères extraits`,
      );

      // === ÉTAPE 2 : Analyse LLM (si disponible) ===
      let llmAnalysis: LlmReceiptAnalysis | null = null;

      if (this.llmService.isAvailable()) {
        this.logger.debug(`[${receiptId}] Étape 2: Analyse LLM...`);
        try {
          llmAnalysis = await this.llmService.analyzeReceiptText(ocrText);
          this.logger.debug(
            `[${receiptId}] LLM terminé: ${llmAnalysis.products.length} produits détectés`,
          );
        } catch (llmError) {
          // Le LLM a échoué mais on continue avec les données OCR basiques
          this.logger.warn(
            `[${receiptId}] LLM échoué (fallback sur OCR seul): ${llmError instanceof Error ? llmError.message : 'Erreur inconnue'}`,
          );
        }
      } else {
        this.logger.warn(
          `[${receiptId}] Service LLM non disponible - Utilisation OCR seul`,
        );
      }

      // === ÉTAPE 3 : Sauvegarde en DB ===
      const processingTime = Date.now() - startTime;

      if (llmAnalysis) {
        // Avec analyse LLM complète
        await this.updateReceiptWithLlmAnalysis(
          receiptId,
          ocrResult,
          llmAnalysis,
          processingTime,
        );
      } else {
        // Fallback : OCR seul (sans suggestions EAN)
        await this.updateReceiptWithOcrResult(receiptId, ocrResult);
      }

      this.logger.log(
        `✓ Traitement réussi pour receipt ${receiptId} en ${processingTime}ms`,
      );
    } catch (error) {
      // Exception : marquer comme FAILED
      const processingTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';

      await this.prisma.receipt.update({
        where: { id: receiptId },
        data: {
          status: ReceiptStatus.FAILED,
          errorMessage,
          processingTime,
        },
      });

      this.logger.error(
        `✗ Exception traitement receipt ${receiptId}: ${errorMessage}`,
      );
    }
  }

  /**
   * Extraire le texte brut du résultat OCR
   */
  private extractTextFromOcrResult(ocrResult: OcrProcessingResult): string {
    const data = ocrResult.data;
    if (!data) return '';

    // Priorité 1: Texte extrait brut dans rawData
    if (data.rawData?.extractedText) {
      return data.rawData.extractedText as string;
    }

    // Priorité 2: Reconstruire depuis les lineItems
    if (data.lineItems && data.lineItems.length > 0) {
      const lines: string[] = [];

      if (data.merchantName) {
        lines.push(data.merchantName);
      }

      for (const item of data.lineItems) {
        let line = item.description;
        if (item.quantity && item.quantity > 1) {
          line = `${item.quantity}x ${line}`;
        }
        if (item.totalPrice) {
          line += ` ${item.totalPrice.toFixed(2)}`;
        }
        lines.push(line);
      }

      if (data.totalAmount) {
        lines.push(`TOTAL ${data.totalAmount.toFixed(2)}`);
      }

      return lines.join('\n');
    }

    // Priorité 3: Fallback vide
    return '';
  }

  /**
   * Mettre à jour le receipt avec les résultats LLM (inclut suggestions EAN)
   */
private async updateReceiptWithLlmAnalysis(
    receiptId: string,
    ocrResult: OcrProcessingResult,
    llmAnalysis: LlmReceiptAnalysis,
    processingTime: number,
  ): Promise<void> {
    // Mettre à jour le receipt
    await this.prisma.receipt.update({
      where: { id: receiptId },
      data: {
        status: ReceiptStatus.COMPLETED,
        merchantName: llmAnalysis.merchantName || ocrResult.data?.merchantName,
        totalAmount: llmAnalysis.totalAmount || ocrResult.data?.totalAmount,
        purchaseDate: llmAnalysis.purchaseDate
          ? new Date(llmAnalysis.purchaseDate)
          : ocrResult.data?.purchaseDate,
        ocrProvider: ocrResult.provider,
        ocrConfidence: llmAnalysis.confidence,
        processingTime,
        rawOcrData: {
          ocrRaw: ocrResult.data?.rawData || {},
          llmAnalysis: {
            merchantName: llmAnalysis.merchantName,
            purchaseDate: llmAnalysis.purchaseDate,
            totalAmount: llmAnalysis.totalAmount,
            confidence: llmAnalysis.confidence,
            productsCount: llmAnalysis.products.length,
          },
        },
      },
    });

    // Créer les items avec suggestions EAN
    if (llmAnalysis.products.length > 0) {
      await this.prisma.receiptItem.createMany({
        data: llmAnalysis.products.map((product) => ({
          id: randomUUID(),
          receiptId,
          detectedName: product.name,
          quantity: product.quantity || 1,
          unitPrice: product.unitPrice,
          totalPrice: product.totalPrice,
          confidence: product.confidence,
          suggestedEans: product.suggestedEans as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        })),
      });
    }
  }

  /**
   * Mettre à jour le receipt avec les résultats OCR seuls (fallback sans LLM)
   */
  private async updateReceiptWithOcrResult(
    receiptId: string,
    ocrResult: OcrProcessingResult,
  ): Promise<void> {
    const data = ocrResult.data;
    if (!data) {
      throw new Error('Données OCR manquantes');
    }

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

    // Créer les items détectés (sans suggestions EAN)
    if (data.lineItems && data.lineItems.length > 0) {
      await this.prisma.receiptItem.createMany({
        data: data.lineItems.map((item) => ({
          id: randomUUID(),
          receiptId,
          detectedName: item.description,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          confidence: item.confidence,
          productCode: item.productCode,
          category: item.category,
          discount: item.discount,
          // Pas de suggestions EAN en mode OCR seul
          suggestedEans: [],
          updatedAt: new Date(),
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
        ReceiptItem: {
          include: {
            Product: true,
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
    const where: {
      userId: string;
      status?: ReceiptStatus;
      documentType?: PrismaDocumentType;
    } = { userId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.documentType) {
      where.documentType = mapDocumentTypeToPrisma(filters.documentType);
    }

    const receipts = await this.prisma.receipt.findMany({
      where,
      include: {
        ReceiptItem: true,
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
      selectedEan?: string;
    },
  ) {
    // Vérifier que le receipt appartient à l'utilisateur
    const receipt = await this.getReceiptById(receiptId, userId);

    // Vérifier que l'item existe
    const item = receipt.ReceiptItem.find((i) => i.id === itemId);
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
    const url = receipt.imageUrl || receipt.pdfUrl;
    if (url) {
      const publicId = this.extractPublicIdFromUrl(url);
      if (publicId) {
        await this.cloudinaryStorage.deleteReceipt(publicId);
      }
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
