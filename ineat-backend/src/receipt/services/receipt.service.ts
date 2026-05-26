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
import { OpenFoodFactsService } from './openfoodfacts.service';
import { NotificationService } from '../../notification/notification.service';
import { ReceiptProcessingQueue } from '../queues/receipt-processing.queue';
import { ObservabilityService } from '../../observability/observability.service';

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
    private readonly openFoodFactsService: OpenFoodFactsService,
    private readonly cloudinaryStorage: CloudinaryStorageService,
    private readonly notificationService: NotificationService,
    private readonly receiptProcessingQueue: ReceiptProcessingQueue,
    private readonly observabilityService: ObservabilityService,
  ) {}

  /**
   * Créer un nouveau receipt et lancer le traitement OCR + LLM
   *
   * @param dto - Données de création
   * @returns Receipt créé avec status PROCESSING
   */
  async createReceipt(dto: CreateReceiptDto) {
    const uploadStartTime = Date.now();

    this.observabilityService.increment('receipt.upload.requested');
    this.observabilityService.trackEvent(
      'receipt.upload.requested',
      'info',
      'Receipt upload requested',
      {
        userId: dto.userId,
        documentType: dto.documentType,
        fileSize: dto.fileBuffer.length,
      },
    );

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
      this.observabilityService.recordTiming(
        'cloudinary.receipt_upload.duration_ms',
        Date.now() - uploadStartTime,
        {
          userId: dto.userId,
          documentType: dto.documentType,
          fileSize: dto.fileBuffer.length,
        },
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
      this.observabilityService.trackEvent(
        'receipt.created',
        'info',
        'Receipt created and ready for queue',
        {
          userId: dto.userId,
          receiptId: receipt.id,
          documentType: dto.documentType,
        },
      );

      // 3. Planifier le traitement OCR + LLM via Bull/Redis.
      await this.scheduleReceiptProcessing(receipt.id, dto);

      return receipt;
    } catch (error) {
      this.observabilityService.increment('receipt.upload.failed');
      this.observabilityService.trackEvent(
        'receipt.upload.failed',
        'error',
        'Receipt upload failed',
        {
          userId: dto.userId,
          documentType: dto.documentType,
          error,
        },
      );
      this.logger.error(
        `Erreur création receipt: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      );
      throw error;
    }
  }

  private async scheduleReceiptProcessing(
    receiptId: string,
    dto: CreateReceiptDto,
  ): Promise<void> {
    const jobData = {
      receiptId,
      fileBuffer: dto.fileBuffer,
      documentType: dto.documentType,
      userId: dto.userId,
      metadata: {
        originalFileName: dto.fileName,
        fileSize: dto.fileBuffer.length,
        uploadedAt: new Date(),
      },
    };

    try {
      await this.receiptProcessingQueue.addReceiptProcessingJob(jobData);
      return;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';

      this.logger.error(
        `Impossible d'ajouter le receipt ${receiptId} à la queue, traitement local de secours: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      this.observabilityService.increment('receipt.queue.enqueue.failed');
      this.observabilityService.trackEvent(
        'receipt.queue.enqueue.failed',
        'error',
        'Receipt processing queue enqueue failed, using local fallback',
        {
          receiptId,
          userId: dto.userId,
          documentType: dto.documentType,
          error,
        },
      );

      setImmediate(() => {
        void this.processReceiptOcrAndLlm(
          receiptId,
          dto.fileBuffer,
          dto.documentType,
        ).catch((fallbackError) => {
          const fallbackErrorMessage =
            fallbackError instanceof Error
              ? fallbackError.message
              : 'Erreur inconnue';
          this.logger.error(
            `Traitement local de secours échoué pour receipt ${receiptId}: ${fallbackErrorMessage}`,
            fallbackError instanceof Error ? fallbackError.stack : undefined,
          );
        });
      });
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
  async processReceiptOcrAndLlm(
    receiptId: string,
    fileBuffer: Buffer,
    documentType: DocumentType,
    options: { throwOnError?: boolean } = {},
  ): Promise<void> {
    this.logger.log(`Traitement OCR + LLM receipt ${receiptId}...`);
    const startTime = Date.now();

    try {
      // === ÉTAPE 1 : OCR avec Tesseract ===
      this.logger.debug(`[${receiptId}] Étape 1: OCR Tesseract...`);
      const ocrStartTime = Date.now();
      const ocrResult = await this.ocrService.processDocument(
        fileBuffer,
        documentType,
      );
      this.observabilityService.recordTiming(
        'receipt.ocr.duration_ms',
        Date.now() - ocrStartTime,
        {
          receiptId,
          documentType,
          success: ocrResult.success,
          confidence: ocrResult.data?.confidence,
        },
      );

      if (!ocrResult.success || !ocrResult.data) {
        this.observabilityService.increment('receipt.ocr.failed');
        this.observabilityService.trackEvent(
          'receipt.ocr.failed',
          'error',
          'Receipt OCR failed',
          {
            receiptId,
            documentType,
            error: ocrResult.error,
          },
        );
        throw new Error(ocrResult.error || 'Erreur OCR inconnue');
      }
      this.observabilityService.increment('receipt.ocr.completed');

      const ocrText = this.extractTextFromOcrResult(ocrResult);
      this.logger.debug(
        `[${receiptId}] OCR terminé: ${ocrText.length} caractères extraits`,
      );

      // === ÉTAPE 2 : Analyse LLM rapide (sans outils web) ===
      let llmAnalysis: LlmReceiptAnalysis | null = null;

      if (this.llmService.isAvailable()) {
        this.logger.debug(`[${receiptId}] Étape 2: Analyse OpenAI rapide...`);
        try {
          const llmStartTime = Date.now();
          llmAnalysis = await this.llmService.analyzeReceiptText(ocrText);
          this.observabilityService.recordTiming(
            'receipt.llm.openai.duration_ms',
            Date.now() - llmStartTime,
            {
              receiptId,
              provider: 'openai_fast',
              productsCount: llmAnalysis.products.length,
              confidence: llmAnalysis.confidence,
            },
          );
          this.observabilityService.increment('receipt.llm.openai.completed');
          this.logger.debug(
            `[${receiptId}] OpenAI terminé: ${llmAnalysis.products.length} produits détectés`,
          );
        } catch (llmError) {
          this.observabilityService.increment('receipt.llm.openai.failed');
          this.observabilityService.trackEvent(
            'receipt.llm.openai.failed',
            'warn',
            'OpenAI receipt analysis failed, using OCR only',
            {
              receiptId,
              error: llmError,
            },
          );
          this.logger.warn(
            `[${receiptId}] OpenAI échoué (fallback sur OCR seul): ${llmError instanceof Error ? llmError.message : 'Erreur inconnue'}`,
          );
        }
      } else {
        this.logger.warn(
          `[${receiptId}] Aucun service LLM disponible - Utilisation OCR seul`,
        );
      }

      // === ÉTAPE 3 : Enrichissement EAN borné via OpenFoodFacts ===
      if (llmAnalysis && llmAnalysis.products.length > 0) {
        const enrichmentStart = Date.now();
        try {
          llmAnalysis = {
            ...llmAnalysis,
            products: await this.openFoodFactsService.enrichProducts(
              llmAnalysis.products,
            ),
          };
          this.observabilityService.recordTiming(
            'receipt.enrichment.openfoodfacts.duration_ms',
            Date.now() - enrichmentStart,
            {
              receiptId,
              productsCount: llmAnalysis.products.length,
            },
          );
          this.logger.debug(
            `[${receiptId}] Enrichissement OpenFoodFacts terminé en ${
              Date.now() - enrichmentStart
            }ms`,
          );
        } catch (enrichmentError) {
          this.observabilityService.increment(
            'receipt.enrichment.openfoodfacts.failed',
          );
          this.observabilityService.trackEvent(
            'receipt.enrichment.openfoodfacts.failed',
            'warn',
            'OpenFoodFacts receipt enrichment failed',
            {
              receiptId,
              error: enrichmentError,
            },
          );
          this.logger.warn(
            `[${receiptId}] Enrichissement EAN ignoré: ${
              enrichmentError instanceof Error
                ? enrichmentError.message
                : 'Erreur inconnue'
            }`,
          );
        }
      }

      // === ÉTAPE 4 : Sauvegarde en DB ===
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
      this.observabilityService.increment('receipt.processing.completed');
      this.observabilityService.recordTiming(
        'receipt.processing.duration_ms',
        processingTime,
        {
          receiptId,
          documentType,
          productsCount: llmAnalysis?.products.length ?? 0,
          usedLlm: Boolean(llmAnalysis),
        },
      );
      this.observabilityService.trackEvent(
        'receipt.processing.completed',
        'info',
        'Receipt processing completed',
        {
          receiptId,
          documentType,
          durationMs: processingTime,
          productsCount: llmAnalysis?.products.length ?? 0,
        },
      );
      await this.notificationService.createReceiptNotification(
        receiptId,
        ReceiptStatus.COMPLETED,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';

      this.logger.error(
        `✗ Exception traitement receipt ${receiptId}: ${errorMessage}`,
      );
      this.observabilityService.increment('receipt.processing.failed');
      this.observabilityService.trackEvent(
        'receipt.processing.failed',
        'error',
        'Receipt processing failed',
        {
          receiptId,
          documentType,
          durationMs: Date.now() - startTime,
          error,
        },
      );

      if (options.throwOnError) {
        throw error;
      }

      const processingTime = Date.now() - startTime;
      await this.prisma.receipt.update({
        where: { id: receiptId },
        data: {
          status: ReceiptStatus.FAILED,
          errorMessage,
          processingTime,
        },
      });
      await this.notificationService.createReceiptNotification(
        receiptId,
        ReceiptStatus.FAILED,
        errorMessage,
      );
    }
  }

  async markReceiptAsFailed(
    receiptId: string,
    errorMessage: string,
  ): Promise<void> {
    this.observabilityService.increment('receipt.processing.final_failed');
    this.observabilityService.trackEvent(
      'receipt.processing.final_failed',
      'error',
      'Receipt processing permanently failed',
      {
        receiptId,
        errorMessage,
      },
    );

    await this.prisma.receipt.update({
      where: { id: receiptId },
      data: {
        status: ReceiptStatus.FAILED,
        errorMessage,
        updatedAt: new Date(),
      },
    });

    await this.notificationService.createReceiptNotification(
      receiptId,
      ReceiptStatus.FAILED,
      errorMessage,
    );
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
      const receiptItems = llmAnalysis.products.map((product) => ({
        id: randomUUID(),
        receiptId,
        detectedName: product.name,
        quantity: product.quantity || 1,
        unitPrice: product.unitPrice,
        totalPrice: product.totalPrice,
        confidence: product.confidence,
        suggestedEans:
          product.suggestedEans as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      }));

      await this.prisma.receiptItem.createMany({
        data: receiptItems,
      });

      // DEBUG: Vérifier les items créés
      this.logger.debug(
        `[${receiptId}] ReceiptItems créés: ${receiptItems.length} items`,
      );
      this.logger.debug(
        `[${receiptId}] Détails items: ${JSON.stringify(
          receiptItems.map((item) => ({
            name: item.detectedName,
            eansCount: Array.isArray(item.suggestedEans)
              ? (item.suggestedEans as unknown[]).length
              : 0,
          })),
        )}`,
      );
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
