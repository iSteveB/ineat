/**
 * Service OCR principal
 *
 * Service qui gère le traitement OCR avec Tesseract.js
 *
 * @module receipt/services/ocr.service
 */

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IOcrProvider,
  DocumentType,
  OcrProcessingResult,
} from '../interfaces/ocr-provider.interface';
import { TesseractOcrProvider } from '../providers/tesseract-ocr.provider';

/**
 * Type de provider OCR disponible
 */
export type OcrProviderType = 'tesseract';

/**
 * Service principal pour le traitement OCR
 *
 * Ce service utilise Tesseract.js pour extraire le texte des tickets de caisse.
 * Tesseract est gratuit, fonctionne en local et n'a pas de limite d'utilisation.
 *
 * @example
 * ```typescript
 * // Traiter un ticket de caisse
 * const result = await ocrService.processDocument(buffer, DocumentType.RECEIPT_IMAGE);
 * ```
 */
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private providers: Map<OcrProviderType, IOcrProvider>;
  private defaultProvider: OcrProviderType;
  private fallbackEnabled: boolean;

  constructor(
    private configService: ConfigService,
    private tesseractProvider: TesseractOcrProvider,
  ) {
    // Enregistrer Tesseract comme seul provider
    this.providers = new Map([['tesseract', tesseractProvider]]);

    // Lire la configuration
    this.defaultProvider = this.configService.get<OcrProviderType>(
      'OCR_DEFAULT_PROVIDER',
      'tesseract',
    );

    this.fallbackEnabled = this.configService.get<boolean>(
      'OCR_ENABLE_FALLBACK',
      false,
    );

    this.logger.log(`Service OCR initialisé avec Tesseract`);
  }

  /**
   * Traiter un document avec le provider par défaut
   *
   * @param buffer - Buffer du fichier
   * @param type - Type de document
   * @returns Résultat du traitement
   *
   * @throws BadRequestException si le provider n'est pas disponible
   */
  async processDocument(
    buffer: Buffer,
    type: DocumentType,
  ): Promise<OcrProcessingResult> {
    this.logger.log(`Traitement document ${type} avec Tesseract`);

    return this.processDocumentWithProvider(buffer, type, this.defaultProvider);
  }

  /**
   * Traiter un document avec un provider spécifique
   *
   * Note: Actuellement seul Tesseract est supporté.
   *
   * @param buffer - Buffer du fichier
   * @param type - Type de document
   * @param providerName - Nom du provider à utiliser ('tesseract')
   * @returns Résultat du traitement
   *
   * @throws BadRequestException si le provider n'existe pas ou n'est pas disponible
   */
  async processDocumentWithProvider(
    buffer: Buffer,
    type: DocumentType,
    providerName: OcrProviderType,
  ): Promise<OcrProcessingResult> {
    // Valider le buffer
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Fichier vide ou invalide');
    }

    // Récupérer le provider
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new BadRequestException(
        `Provider "${providerName}" non trouvé. Seul Tesseract est disponible.`,
      );
    }

    // Vérifier la disponibilité
    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      throw new BadRequestException(
        `Provider "${providerName}" non disponible`,
      );
    }

    // Vérifier le support du type de document
    if (!provider.supportsDocumentType(type)) {
      throw new BadRequestException(
        `Provider "${providerName}" ne supporte pas le type de document "${type}"`,
      );
    }

    this.logger.debug(
      `Traitement avec ${providerName}: ${type}, taille: ${buffer.length} bytes`,
    );

    // Traiter le document
    const result = await provider.processDocument(buffer, type);

    // Logger le résultat
    if (result.success) {
      this.logger.log(
        `✓ Traitement réussi avec ${providerName} en ${result.processingTime}ms (confiance: ${result.data?.confidence?.toFixed(2) || 'N/A'})`,
      );
    } else {
      this.logger.warn(
        `✗ Échec du traitement avec ${providerName}: ${result.error}`,
      );
    }

    return result;
  }

  /**
   * Traiter un document (avec ou sans fallback, même comportement)
   *
   * Note: Avec un seul provider (Tesseract), cette méthode fait la même chose
   * que processDocument(). Gardée pour compatibilité avec le code existant.
   *
   * @param buffer - Buffer du fichier
   * @param type - Type de document
   * @returns Résultat du traitement
   *
   * @throws BadRequestException si le traitement échoue
   */
  async processDocumentWithFallback(
    buffer: Buffer,
    type: DocumentType,
  ): Promise<OcrProcessingResult> {
    // Avec un seul provider, pas besoin de fallback complexe
    this.logger.log(`Traitement avec Tesseract (provider unique)`);

    return this.processDocument(buffer, type);
  }

  /**
   * Obtenir la liste des providers disponibles
   *
   * @returns Liste des noms de providers disponibles et configurés
   */
  async getAvailableProviders(): Promise<string[]> {
    const available: string[] = [];

    for (const [name, provider] of this.providers.entries()) {
      try {
        if (await provider.isAvailable()) {
          available.push(name);
        }
      } catch (error) {
        this.logger.warn(
          `Erreur lors de la vérification de ${name}: ${error.message}`,
        );
      }
    }

    this.logger.debug(
      `Providers disponibles: ${available.join(', ') || 'aucun'}`,
    );
    return available;
  }

  /**
   * Obtenir des informations sur les providers
   *
   * @returns Informations détaillées sur chaque provider
   */
  async getProvidersInfo(): Promise<
    Array<{
      name: string;
      available: boolean;
      supportedTypes: DocumentType[];
    }>
  > {
    const infos = [];

    for (const [name, provider] of this.providers.entries()) {
      const available = await provider.isAvailable();
      const supportedTypes = Object.values(DocumentType).filter((type) =>
        provider.supportsDocumentType(type),
      );

      infos.push({
        name,
        available,
        supportedTypes,
      });
    }

    return infos;
  }

  /**
   * Obtenir le provider par défaut configuré
   */
  getDefaultProvider(): string {
    return this.defaultProvider;
  }

  /**
   * Vérifier si le fallback est activé
   */
  isFallbackEnabled(): boolean {
    return this.fallbackEnabled;
  }
}
