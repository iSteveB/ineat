/**
 * Processor de traitement des receipts
 *
 * Worker asynchrone responsable du traitement complet des receipts :
 * OCR → Analyse → Matching produits → Mise à jour base de données
 *
 * @module receipt/processors/receipt.processor
 */

import {
  OnQueueFailed,
  OnQueueProgress,
  Processor,
  Process,
} from '@nestjs/bull';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { DocumentType } from '../interfaces/ocr-provider.interface';
import { ReceiptService } from '../services/receipt.service';

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

  constructor(private readonly receiptService: ReceiptService) {}

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
      job.progress(10);
      await this.receiptService.processReceiptOcrAndLlm(
        receiptId,
        fileBuffer,
        documentType,
        { throwOnError: true },
      );
      job.progress(100);

      const processingTime = Date.now() - startTime;
      const result: ProcessingResult = {
        success: true,
        receiptId,
        processingTime,
        itemsDetected: 0,
        itemsMatched: 0,
        overallConfidence: 0,
      };

      this.logger.log(
        `✅ Receipt ${receiptId} traité avec succès en ${processingTime}ms`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `❌ Erreur traitement receipt ${receiptId}: ${error.message}`,
        error.stack,
      );

      // Re-throw pour que Bull gère le retry
      throw error;
    }
  }

  /**
   * Gérer l'échec d'un job (appelé par Bull)
   */
  @OnQueueFailed()
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
      await this.receiptService.markReceiptAsFailed(
        receiptId,
        `Échec définitif après ${job.attemptsMade} tentatives: ${error.message}`,
      );
    }
  }

  /**
   * Gérer la progression d'un job (appelé par Bull)
   */
  @OnQueueProgress()
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
