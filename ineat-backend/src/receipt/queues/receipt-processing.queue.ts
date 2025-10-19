/**
 * Queue de traitement des receipts
 * 
 * Service responsable de la gestion de la queue asynchrone pour le traitement
 * des tickets de caisse et factures drive avec Bull/Redis
 * 
 * @module receipt/queues/receipt-processing.queue
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job, JobOptions } from 'bull';
import { ReceiptProcessingJobData } from '../processors/receipt.processor';
import { DocumentType } from '../interfaces/ocr-provider.interface';

/**
 * Configuration des jobs par type de document
 */
interface QueueConfig {
  /** Nombre de tentatives en cas d'échec */
  attempts: number;
  
  /** Délai avant retry (en ms) */
  backoff: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  
  /** Timeout du job (en ms) */
  timeout: number;
  
  /** Priorité du job (plus élevé = plus prioritaire) */
  priority: number;
}

/**
 * Service de gestion de la queue de traitement des receipts
 * 
 * Ce service gère l'ajout, le suivi et la configuration des jobs
 * de traitement OCR des documents uploadés par les utilisateurs.
 * 
 * Utilise Bull/Redis pour la persistence et la distribution des jobs.
 * 
 * @example
 * ```typescript
 * // Ajouter un job à la queue
 * const job = await queueService.addReceiptProcessingJob({
 *   receiptId: 'receipt-123',
 *   fileBuffer: buffer,
 *   documentType: DocumentType.RECEIPT_IMAGE,
 *   userId: 'user-456'
 * });
 * 
 * // Suivre le statut
 * const status = await queueService.getJobStatus(job.id);
 * ```
 */
@Injectable()
export class ReceiptProcessingQueue {
  private readonly logger = new Logger(ReceiptProcessingQueue.name);

  /** Configuration par type de document */
  private readonly configs: Record<DocumentType, QueueConfig> = {
    [DocumentType.RECEIPT_IMAGE]: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // 2s, puis 4s, puis 8s
      },
      timeout: 60000, // 1 minute max
      priority: 1,
    },
    [DocumentType.INVOICE_PDF]: {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 3000, // 3s entre chaque retry
      },
      timeout: 30000, // 30s max (plus rapide)
      priority: 2, // Plus prioritaire que les images
    },
    [DocumentType.INVOICE_HTML]: {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 3000,
      },
      timeout: 30000,
      priority: 2,
    },
  };

  constructor(
    @InjectQueue('receipt-processing')
    private readonly queue: Queue<ReceiptProcessingJobData>,
  ) {
    this.setupQueueEvents();
  }

  /**
   * Ajouter un job de traitement de receipt à la queue
   * 
   * @param jobData - Données du job
   * @returns Job créé avec son ID
   */
  async addReceiptProcessingJob(
    jobData: ReceiptProcessingJobData,
  ): Promise<Job<ReceiptProcessingJobData>> {
    const config = this.configs[jobData.documentType];
    
    const jobOptions: JobOptions = {
      attempts: config.attempts,
      backoff: config.backoff,
      timeout: config.timeout,
      priority: config.priority,
      // Données supplémentaires pour le monitoring
      jobId: `receipt-${jobData.receiptId}`, // ID unique basé sur le receipt
      removeOnComplete: 50, // Garder les 50 derniers jobs complétés
      removeOnFail: 100, // Garder les 100 derniers jobs échoués
    };

    this.logger.log(
      `Ajout job à la queue: receipt ${jobData.receiptId}, type: ${jobData.documentType}, user: ${jobData.userId}`,
    );

    try {
      const job = await this.queue.add('process-receipt', jobData, jobOptions);
      
      this.logger.debug(
        `Job ${job.id} créé pour receipt ${jobData.receiptId}`,
      );
      
      return job;
    } catch (error) {
      this.logger.error(
        `Erreur ajout job pour receipt ${jobData.receiptId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Récupérer le statut d'un job
   * 
   * @param jobId - ID du job
   * @returns Statut et informations du job
   */
  async getJobStatus(jobId: string | number): Promise<{
    id: string | number;
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
    progress: number;
    data: ReceiptProcessingJobData;
    result?: any;
    error?: string;
    createdAt: Date;
    processedAt?: Date;
    finishedAt?: Date;
    attemptsMade: number;
    attemptsMax: number;
  }> {
    const job = await this.queue.getJob(jobId);
    
    if (!job) {
      throw new Error(`Job ${jobId} non trouvé`);
    }

    // Déterminer le statut
    let status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
    
    if (await job.isCompleted()) {
      status = 'completed';
    } else if (await job.isFailed()) {
      status = 'failed';
    } else if (await job.isActive()) {
      status = 'active';
    } else if (await job.isDelayed()) {
      status = 'delayed';
    } else {
      status = 'waiting';
    }

    return {
      id: job.id,
      status,
      progress: job.progress(),
      data: job.data,
      result: job.returnvalue,
      error: job.failedReason,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      attemptsMade: job.attemptsMade,
      attemptsMax: job.opts.attempts || 1,
    };
  }

  /**
   * Récupérer tous les jobs d'un utilisateur
   * 
   * @param userId - ID de l'utilisateur
   * @returns Liste des jobs
   */
  async getUserJobs(userId: string): Promise<Array<{
    id: string | number;
    receiptId: string;
    status: string;
    progress: number;
    createdAt: Date;
  }>> {
    // Récupérer tous les jobs (waiting, active, completed, failed)
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getActive(),
      this.queue.getCompleted(),
      this.queue.getFailed(),
    ]);

    const allJobs = [...waiting, ...active, ...completed, ...failed];
    
    // Filtrer par utilisateur
    const userJobs = allJobs.filter(job => job.data.userId === userId);
    
    // Mapper vers le format de retour
    const result = await Promise.all(
      userJobs.map(async (job) => {
        let status: string;
        
        if (await job.isCompleted()) {
          status = 'completed';
        } else if (await job.isFailed()) {
          status = 'failed';
        } else if (await job.isActive()) {
          status = 'active';
        } else if (await job.isDelayed()) {
          status = 'delayed';
        } else {
          status = 'waiting';
        }

        return {
          id: job.id,
          receiptId: job.data.receiptId,
          status,
          progress: job.progress(),
          createdAt: new Date(job.timestamp),
        };
      }),
    );

    // Trier par date de création (plus récent en premier)
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Annuler un job en attente
   * 
   * @param jobId - ID du job
   * @returns true si annulé avec succès
   */
  async cancelJob(jobId: string | number): Promise<boolean> {
    try {
      const job = await this.queue.getJob(jobId);
      
      if (!job) {
        return false;
      }

      // Ne peut annuler que les jobs en attente ou délayés
      if (await job.isWaiting() || await job.isDelayed()) {
        await job.remove();
        this.logger.log(`Job ${jobId} annulé`);
        return true;
      }

      this.logger.warn(`Job ${jobId} ne peut pas être annulé (statut: actif ou terminé)`);
      return false;
    } catch (error) {
      this.logger.error(`Erreur annulation job ${jobId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtenir les statistiques de la queue
   * 
   * @returns Statistiques détaillées
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getActive(),
      this.queue.getCompleted(),
      this.queue.getFailed(),
      this.queue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused: await this.queue.isPaused(),
    };
  }

  /**
   * Nettoyer les anciens jobs
   * 
   * @param olderThanMs - Supprimer les jobs plus vieux que X millisecondes
   */
  async cleanOldJobs(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    this.logger.log(`Nettoyage des jobs plus vieux que ${olderThanMs}ms`);
    
    try {
      await this.queue.clean(olderThanMs, 'completed');
      await this.queue.clean(olderThanMs, 'failed');
      
      this.logger.log('Nettoyage des anciens jobs terminé');
    } catch (error) {
      this.logger.error(`Erreur nettoyage jobs: ${error.message}`);
    }
  }

  /**
   * Configurer les événements de la queue
   */
  private setupQueueEvents(): void {
    this.queue.on('completed', (job: Job<ReceiptProcessingJobData>, result: any) => {
      this.logger.log(
        `✅ Job ${job.id} complété pour receipt ${job.data.receiptId} en ${Date.now() - job.timestamp}ms`,
      );
    });

    this.queue.on('failed', (job: Job<ReceiptProcessingJobData>, error: Error) => {
      this.logger.error(
        `❌ Job ${job.id} échoué pour receipt ${job.data.receiptId}: ${error.message}`,
      );
    });

    this.queue.on('active', (job: Job<ReceiptProcessingJobData>) => {
      this.logger.debug(
        `🔄 Job ${job.id} démarré pour receipt ${job.data.receiptId}`,
      );
    });

    this.queue.on('stalled', (job: Job<ReceiptProcessingJobData>) => {
      this.logger.warn(
        `⚠️ Job ${job.id} bloqué pour receipt ${job.data.receiptId}`,
      );
    });

    this.queue.on('progress', (job: Job<ReceiptProcessingJobData>, progress: number) => {
      this.logger.debug(
        `📊 Job ${job.id} progression: ${progress}% (receipt ${job.data.receiptId})`,
      );
    });
  }

  /**
   * Obtenir l'instance de la queue (pour usage avancé)
   */
  getQueue(): Queue<ReceiptProcessingJobData> {
    return this.queue;
  }
}