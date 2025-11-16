import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWorker, Worker } from 'tesseract.js';

/**
 * Interface pour le résultat OCR standardisé
 */
export interface OcrReceiptData {
  merchantName: string | null;
  merchantAddress: string | null;
  totalAmount: number | null;
  taxAmount: number | null;
  purchaseDate: Date | null;
  currency: string | null;
  lineItems: OcrLineItem[];
  confidence: number; // 0-1
  rawData?: Record<string, unknown>;
  extractedText?: string; // Texte brut extrait (pour Tesseract)
}

export interface OcrLineItem {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  confidence: number;
}

export interface OcrProcessingResult {
  success: boolean;
  data?: OcrReceiptData;
  error?: string;
  processingTime: number; // ms
  provider: string;
}

/**
 * Interface commune pour tous les providers OCR
 */
export interface IOcrProvider {
  readonly name: string;
  processReceipt(imageBuffer: Buffer): Promise<OcrProcessingResult>;
  isAvailable(): Promise<boolean>;
}

/**
 * Provider OCR utilisant Tesseract.js
 *
 * Tesseract est une solution OCR open-source gratuite.
 * Avantages :
 * - Complètement gratuit
 * - Pas de limite d'utilisation
 * - Fonctionne hors ligne
 *
 * Inconvénients :
 * - Précision moindre (60-80% vs 90-95% pour Mindee)
 * - Ne retourne que du texte brut (pas de structured data)
 * - Nécessite un LLM pour extraire les informations structurées
 *
 * @example
 * ```typescript
 * const provider = new TesseractOcrProvider(configService);
 * const result = await provider.processReceipt(imageBuffer);
 * // result.data.extractedText contient le texte brut
 * ```
 */
@Injectable()
export class TesseractOcrProvider implements IOcrProvider {
  readonly name = 'tesseract';
  private readonly logger = new Logger(TesseractOcrProvider.name);
  private worker: Worker | null = null;
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Initialise le worker Tesseract
   * Le worker est réutilisé entre les appels pour de meilleures performances
   */
  private async initializeWorker(): Promise<void> {
    if (this.isInitialized && this.worker) {
      return;
    }

    try {
      this.logger.log('Initialisation du worker Tesseract...');

      this.worker = await createWorker('fra', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            this.logger.debug(
              `Reconnaissance: ${Math.round(m.progress * 100)}%`,
            );
          }
        },
      });

      this.isInitialized = true;
      this.logger.log('Worker Tesseract initialisé avec succès');
    } catch (error) {
      this.logger.error(
        "Erreur lors de l'initialisation du worker Tesseract",
        error,
      );
      throw error;
    }
  }

  /**
   * Vérifie si le provider est disponible
   * Tesseract est toujours disponible car c'est une bibliothèque locale
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * Traite un ticket de caisse et extrait le texte brut
   *
   * @param imageBuffer - Buffer de l'image du ticket
   * @returns Résultat OCR avec le texte brut extrait
   */
  async processReceipt(imageBuffer: Buffer): Promise<OcrProcessingResult> {
    const startTime = Date.now();

    try {
      // Initialiser le worker si nécessaire
      await this.initializeWorker();

      if (!this.worker) {
        throw new Error('Worker Tesseract non initialisé');
      }

      this.logger.log('Démarrage de la reconnaissance OCR avec Tesseract...');

      // Reconnaissance du texte
      const { data } = await this.worker.recognize(imageBuffer);

      const processingTime = Date.now() - startTime;

      this.logger.log(`OCR Tesseract terminé en ${processingTime}ms`);
      this.logger.log(`Confiance globale: ${Math.round(data.confidence)}%`);
      this.logger.log(`Texte extrait: ${data.text.length} caractères`);

      // Nettoyage du texte
      const cleanedText = this.cleanExtractedText(data.text);

      // Pour Tesseract, on retourne le texte brut
      // L'extraction des champs structurés sera faite par le LLM
      const ocrData: OcrReceiptData = {
        merchantName: null,
        merchantAddress: null,
        totalAmount: null,
        taxAmount: null,
        purchaseDate: null,
        currency: 'EUR', // Par défaut pour la France
        lineItems: [],
        confidence: data.confidence / 100, // Convertir en 0-1
        extractedText: cleanedText,
        rawData: {
          textLength: cleanedText.length,
          originalTextLength: data.text.length,
          confidencePercent: data.confidence,
        },
      };

      return {
        success: true,
        data: ocrData,
        processingTime,
        provider: this.name,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';

      this.logger.error('Erreur lors du traitement OCR Tesseract', error);

      return {
        success: false,
        error: errorMessage,
        processingTime,
        provider: this.name,
      };
    }
  }

  /**
   * Nettoie le texte extrait par Tesseract
   * - Supprime les espaces multiples
   * - Supprime les lignes vides
   * - Normalise les sauts de ligne
   *
   * @param text - Texte brut extrait par Tesseract
   * @returns Texte nettoyé
   */
  private cleanExtractedText(text: string): string {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');
  }

  /**
   * Termine le worker Tesseract
   * À appeler lors de l'arrêt de l'application
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      this.logger.log('Arrêt du worker Tesseract...');
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.logger.log('Worker Tesseract arrêté');
    }
  }

  /**
   * Hook appelé lors de la destruction du module
   */
  async onModuleDestroy(): Promise<void> {
    await this.terminate();
  }
}
