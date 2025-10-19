/**
 * Processor de traitement des receipts
 *
 * Worker asynchrone responsable du traitement complet des receipts :
 * OCR → Analyse → Matching produits → Mise à jour base de données
 *
 * @module receipt/processors/receipt.processor
 */

import { Processor, Process } from '@nestjs/bull';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { OcrService } from '../services/ocr.service';
import { ReceiptAnalysisService } from '../services/receipt-analysis.service';
import { ProductMatchingService } from '../services/product-matching.service';
import { DocumentType } from '../interfaces/ocr-provider.interface';
import { ReceiptStatus } from '@prisma/client';

/**
 * Données du job de traitement de receipt
 */
export interface ReceiptProcessingJobData {
  /** ID du receipt à traiter */
  receiptId: string;

  /** Buffer du fichier à traiter */
  fileBuffer: Buffer;

  /** Type de document */
  documentType: DocumentType;

  /** ID de l'utilisateur */
  userId: string;

  /** Métadonnées optionnelles */
  metadata?: {
    originalFileName?: string;
    fileSize?: number;
    uploadedAt?: Date;
  };
}

/**
 * Résultat du traitement d'un receipt
 */
interface ProcessingResult {
  success: boolean;
  receiptId: string;
  processingTime: number;
  itemsDetected: number;
  itemsMatched: number;
  overallConfidence: number;
  error?: string;
}

/**
 * Processor asynchrone pour les receipts
 *
 * Ce processor gère le workflow complet de traitement :
 * 1. Lecture du fichier depuis le stockage
 * 2. Traitement OCR via OcrService
 * 3. Analyse des données via ReceiptAnalysisService
 * 4. Matching des produits via ProductMatchingService
 * 5. Mise à jour de la base de données
 * 6. Gestion des erreurs et retry automatique
 *
 * @example
 * ```typescript
 * // Le job est automatiquement lancé par la queue
 * // Pas d'appel direct, utiliser ReceiptProcessingQueue
 * ```
 */
@Processor('receipt-processing')
@Injectable()
export class ReceiptProcessor {
  private readonly logger = new Logger(ReceiptProcessor.name);

  constructor(
    private prisma: PrismaService,
    private ocrService: OcrService,
    private analysisService: ReceiptAnalysisService,
    private matchingService: ProductMatchingService,
  ) {}

  /**
   * Traiter un receipt complet
   *
   * @param job - Job Bull avec les données du receipt
   * @returns Résultat du traitement
   */
  @Process('process-receipt')
  async processReceipt(
    job: Job<ReceiptProcessingJobData>,
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const { receiptId, fileBuffer, documentType, userId } = job.data;

    this.logger.log(
      `Début traitement receipt ${receiptId} pour user ${userId}`,
    );

    try {
      // 1. Mettre à jour le statut en PROCESSING si pas déjà fait
      await this.updateReceiptStatus(receiptId, ReceiptStatus.PROCESSING);

      // 2. Traitement OCR
      this.logger.debug(`Étape 1/4: OCR pour receipt ${receiptId}`);
      job.progress(25);

      const ocrResult = await this.ocrService.processDocument(
        fileBuffer,
        documentType,
      );

      if (!ocrResult.success || !ocrResult.data) {
        throw new Error(`OCR échoué: ${ocrResult.error}`);
      }

      // 3. Analyse des données OCR
      this.logger.debug(`Étape 2/4: Analyse pour receipt ${receiptId}`);
      job.progress(50);

      const analysisResult = await this.analysisService.analyzeReceipt(
        ocrResult.data,
      );

      // 4. Matching des produits
      this.logger.debug(
        `Étape 3/4: Matching produits pour receipt ${receiptId}`,
      );
      job.progress(75);

      const matchingResults = await this.matchingService.matchMultipleItems(
        analysisResult.receiptData.lineItems,
      );

      // 5. Mise à jour de la base de données
      this.logger.debug(`Étape 4/4: Mise à jour DB pour receipt ${receiptId}`);
      job.progress(90);

      await this.updateReceiptWithResults(
        receiptId,
        analysisResult,
        matchingResults,
        ocrResult,
      );

      // 6. Finaliser
      await this.updateReceiptStatus(receiptId, ReceiptStatus.COMPLETED);
      job.progress(100);

      const processingTime = Date.now() - startTime;
      const result: ProcessingResult = {
        success: true,
        receiptId,
        processingTime,
        itemsDetected: analysisResult.receiptData.lineItems.length,
        itemsMatched: matchingResults.filter((r) => r.bestMatch !== null)
          .length,
        overallConfidence: analysisResult.metadata.overallConfidence,
      };

      this.logger.log(
        `✅ Receipt ${receiptId} traité avec succès en ${processingTime}ms - ${result.itemsDetected} items détectés, ${result.itemsMatched} matchés`,
      );

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(
        `❌ Erreur traitement receipt ${receiptId}: ${error.message}`,
        error.stack,
      );

      // Marquer comme échoué
      await this.updateReceiptStatus(
        receiptId,
        ReceiptStatus.FAILED,
        error.message,
      );

      const result: ProcessingResult = {
        success: false,
        receiptId,
        processingTime,
        itemsDetected: 0,
        itemsMatched: 0,
        overallConfidence: 0,
        error: error.message,
      };

      // Re-throw pour que Bull gère le retry
      throw error;
    }
  }

  /**
   * Mettre à jour le statut d'un receipt
   */
  private async updateReceiptStatus(
    receiptId: string,
    status: ReceiptStatus,
    errorMessage?: string,
  ): Promise<void> {
    await this.prisma.receipt.update({
      where: { id: receiptId },
      data: {
        status,
        errorMessage: errorMessage || null,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Mettre à jour le receipt avec les résultats complets
   */
  private async updateReceiptWithResults(
    receiptId: string,
    analysisResult: any,
    matchingResults: any[],
    ocrResult: any,
  ): Promise<void> {
    const receiptData = analysisResult.receiptData;

    // Mettre à jour le receipt principal avec tous les champs du schéma mis à jour
    await this.prisma.receipt.update({
      where: { id: receiptId },
      data: {
        merchantName: receiptData.merchantName,
        merchantAddress: receiptData.merchantAddress,
        totalAmount: receiptData.totalAmount,
        purchaseDate: receiptData.purchaseDate,
        invoiceNumber: receiptData.invoiceNumber,
        orderNumber: receiptData.orderNumber,
        ocrProvider: ocrResult.provider,
        ocrConfidence: receiptData.confidence,
        processingTime: ocrResult.processingTime,
        rawOcrData: receiptData.rawData || {},
      },
    });

    // Créer les items détectés avec leur matching
    const receiptItems = matchingResults.map((matchResult, index) => {
      const item = matchResult.originalItem;
      const bestMatch = matchResult.bestMatch;

      return {
        receiptId,
        detectedName: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        confidence: item.confidence,
        productCode: item.productCode,
        category: matchResult.suggestedCategory,
        discount: item.discount,
        // Association avec produit si bon match
        productId:
          bestMatch && bestMatch.score > 0.7 ? bestMatch.product.id : null,
        validated: bestMatch && bestMatch.score > 0.9 ? true : false,
      };
    });

    if (receiptItems.length > 0) {
      await this.prisma.receiptItem.createMany({
        data: receiptItems,
      });
    }
  }

  /**
   * Gérer l'échec d'un job (appelé par Bull)
   */
  async handleFailedJob(
    job: Job<ReceiptProcessingJobData>,
    error: Error,
  ): Promise<void> {
    const { receiptId } = job.data;

    this.logger.error(
      `Job échoué pour receipt ${receiptId} après ${job.attemptsMade} tentatives: ${error.message}`,
    );

    // Marquer définitivement comme échoué si toutes les tentatives sont épuisées
    if (job.attemptsMade >= (job.opts.attempts || 1)) {
      await this.updateReceiptStatus(
        receiptId,
        ReceiptStatus.FAILED,
        `Échec définitif après ${job.attemptsMade} tentatives: ${error.message}`,
      );
    }
  }

  /**
   * Gérer la progression d'un job (appelé par Bull)
   */
  async handleProgress(
    job: Job<ReceiptProcessingJobData>,
    progress: number,
  ): Promise<void> {
    const { receiptId } = job.data;

    this.logger.debug(`Receipt ${receiptId}: ${progress}% terminé`);

    // Optionnel : mettre à jour une table de progression en base
    // ou envoyer via WebSocket aux clients
  }

  /**
   * Obtenir les statistiques de traitement
   */
  getProcessingStats(): Record<string, any> {
    // Ces stats pourraient être maintenues en mémoire ou en cache
    return {
      totalProcessed: 0, // À implémenter
      successRate: 0, // À implémenter
      avgProcessingTime: 0, // À implémenter
      avgConfidence: 0, // À implémenter
    };
  }
}
