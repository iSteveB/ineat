/**
 * Provider OCR Tesseract
 *
 * Implémentation gratuite et locale de l'OCR avec Tesseract.js
 * Alternative à Mindee pour éviter les coûts d'API.
 *
 * Note: Moins précis que Mindee mais gratuit et sans limite.
 *
 * @module receipt/providers/tesseract-ocr.provider
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  IOcrProvider,
  DocumentType,
  OcrProcessingResult,
  OcrReceiptData,
  OcrLineItem,
} from '../interfaces/ocr-provider.interface';
import { createWorker, Worker } from 'tesseract.js';

/**
 * Provider OCR utilisant Tesseract.js
 *
 * Avantages :
 * - Gratuit et sans limite
 * - Fonctionne en local (pas besoin d'API externe)
 * - Supporte plusieurs langues
 *
 * Inconvénients :
 * - Moins précis que Mindee pour les tickets de caisse
 * - Nécessite un parsing manuel du texte extrait
 * - Plus lent que les solutions cloud
 */
@Injectable()
export class TesseractOcrProvider implements IOcrProvider {
  readonly name = 'tesseract';
  private readonly logger = new Logger(TesseractOcrProvider.name);
  private worker: Worker | null = null;

  /**
   * Initialise le worker Tesseract
   */
  private async initializeWorker(): Promise<Worker> {
    if (this.worker) {
      return this.worker;
    }

    this.logger.debug('Initialisation du worker Tesseract...');

    try {
      const worker = await createWorker('fra', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            this.logger.debug(`OCR en cours: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      this.worker = worker;
      this.logger.log('✓ Worker Tesseract initialisé');
      return worker;
    } catch (error) {
      this.logger.error(`Erreur initialisation Tesseract: ${error.message}`);
      throw error;
    }
  }

  /**
   * Traiter un document avec Tesseract
   */
  async processDocument(
    buffer: Buffer,
    type: DocumentType,
  ): Promise<OcrProcessingResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`Traitement ${type} avec Tesseract...`);

      // Vérifier le type supporté
      if (!this.supportsDocumentType(type)) {
        throw new Error(`Type de document ${type} non supporté par Tesseract`);
      }

      // Initialiser le worker
      const worker = await this.initializeWorker();

      // Extraire le texte
      this.logger.debug('Extraction du texte en cours...');
      const { data } = await worker.recognize(buffer);
      const extractedText = data.text;

      this.logger.debug(`Texte extrait (${extractedText.length} caractères)`);

      // Parser le texte pour extraire les informations structurées
      const parsedData = this.parseReceiptText(extractedText);

      const processingTime = Date.now() - startTime;

      this.logger.log(
        `✓ Traitement réussi en ${processingTime}ms (confiance: ${Math.round(parsedData.confidence * 100)}%)`,
      );

      return {
        success: true,
        data: parsedData,
        processingTime,
        provider: this.name,
        documentType: type,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `❌ Échec du traitement après ${processingTime}ms: ${error.message}`,
      );

      return {
        success: false,
        error: error.message,
        processingTime,
        provider: this.name,
        documentType: type,
      };
    }
  }

  /**
   * Parser le texte brut extrait pour créer des données structurées
   *
   * Cette fonction fait un parsing basique. Pour de meilleurs résultats,
   * il faudrait utiliser un LLM (GPT-4, Claude) pour analyser le texte.
   */
  private parseReceiptText(text: string): OcrReceiptData {
    const lines = text.split('\n').filter((line) => line.trim().length > 0);

    // Extraction basique des informations
    let merchantName: string | null = null;
    let totalAmount: number | null = null;
    let purchaseDate: Date | null = null;
    const lineItems: OcrLineItem[] = [];

    // Regex pour détecter les prix (ex: 1.50, 12,99€, 5.00 EUR)
    const priceRegex = /(\d+[.,]\d{2})\s*€?/g;

    // Regex pour détecter les dates (ex: 01/12/2024, 2024-12-01)
    const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;

    // Regex pour détecter "TOTAL" ou "TOTAL TTC"
    const totalRegex = /total\s*(?:ttc)?\s*:?\s*(\d+[.,]\d{2})/i;

    // Parcourir les lignes
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Le nom du magasin est souvent sur les 2-3 premières lignes
      if (i < 3 && !merchantName && line.length > 3 && line.length < 50) {
        // Éviter les lignes qui sont des adresses ou des numéros
        if (!/^\d+/.test(line) && !/^tel/i.test(line)) {
          merchantName = line;
        }
      }

      // Chercher le total
      const totalMatch = line.match(totalRegex);
      if (totalMatch) {
        totalAmount = parseFloat(totalMatch[1].replace(',', '.'));
      }

      // Chercher la date
      const dateMatch = line.match(dateRegex);
      if (dateMatch && !purchaseDate) {
        try {
          const dateStr = dateMatch[1];
          // Essayer de parser la date (format FR: JJ/MM/AAAA)
          const parts = dateStr.split(/[\/\-]/);
          if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // Mois commence à 0
            const year = parseInt(parts[2]);
            const fullYear = year < 100 ? 2000 + year : year;

            // Valider la date
            if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
              purchaseDate = new Date(fullYear, month, day);
            }
          }
        } catch {
          // Ignorer les erreurs de parsing de date
        }
      }

      // Détecter les lignes de produits (contient un prix)
      const prices = Array.from(line.matchAll(priceRegex));
      if (prices.length > 0 && !totalMatch) {
        // Cette ligne contient probablement un produit
        const price = parseFloat(
          prices[prices.length - 1][1].replace(',', '.'),
        );

        // Le nom du produit est le texte avant le prix
        const priceIndex = line.lastIndexOf(prices[prices.length - 1][0]);
        const description = line.substring(0, priceIndex).trim();

        // Filtrer les lignes qui ne sont clairement pas des produits
        if (
          description.length > 2 &&
          !/^(total|sous-total|tva|remise|paiement)/i.test(description)
        ) {
          lineItems.push({
            description,
            quantity: 1, // On ne peut pas détecter la quantité facilement
            unitPrice: price,
            totalPrice: price,
            confidence: 0.6, // Confiance moyenne pour Tesseract
          });
        }
      }
    }

    // Calculer une confiance globale basique
    let confidence = 0.5; // Base
    if (merchantName) confidence += 0.15;
    if (totalAmount !== null) confidence += 0.15;
    if (purchaseDate !== null) confidence += 0.1;
    if (lineItems.length > 0) confidence += 0.1;

    this.logger.log(
      `📊 Parsing terminé: ${lineItems.length} produits, confiance ${Math.round(confidence * 100)}%`,
    );

    return {
      merchantName,
      merchantAddress: null, // Difficile à extraire sans structure
      totalAmount,
      taxAmount: null,
      purchaseDate,
      currency: 'EUR',
      lineItems,
      confidence,
      rawData: { extractedText: text },
    };
  }

  /**
   * Vérifier le support du type de document
   */
  supportsDocumentType(type: DocumentType): boolean {
    // Tesseract supporte uniquement les images pour l'instant
    // Les PDFs nécessiteraient une conversion en image d'abord
    return type === DocumentType.RECEIPT_IMAGE;
  }

  /**
   * Vérifier la disponibilité
   *
   * Tesseract est toujours disponible car il fonctionne en local
   * sans nécessiter d'API key externe
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Vérifier que tesseract.js est bien installé
      if (!createWorker) {
        this.logger.error(
          'Tesseract.js non disponible - npm install tesseract.js',
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Erreur vérification disponibilité Tesseract: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Cleanup du worker à la destruction du service
   */
  async onModuleDestroy() {
    if (this.worker) {
      this.logger.debug('Arrêt du worker Tesseract...');
      try {
        await this.worker.terminate();
        this.worker = null;
        this.logger.log('✓ Worker Tesseract arrêté');
      } catch (error) {
        this.logger.error(`Erreur arrêt worker: ${error.message}`);
      }
    }
  }
}
