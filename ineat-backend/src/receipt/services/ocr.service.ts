/**
 * Service OCR principal
 * 
 * Service orchestrateur qui gère les différents providers OCR
 * et implémente la logique de sélection et de fallback
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
import { MindeeOcrProvider } from '../providers/mindee-ocr.provider';

/**
 * Types de providers OCR disponibles
 */
export type OcrProviderType = 'mindee' | 'google-vision' | 'tesseract';

/**
 * Service principal pour le traitement OCR
 * 
 * Ce service :
 * - Gère plusieurs providers OCR (Mindee, Google Vision, Tesseract)
 * - Sélectionne automatiquement le meilleur provider
 * - Implémente un système de fallback en cas d'échec
 * - Permet de forcer l'utilisation d'un provider spécifique
 * 
 * @example
 * ```typescript
 * // Utiliser le provider par défaut
 * const result = await ocrService.processDocument(buffer, DocumentType.RECEIPT_IMAGE);
 * 
 * // Forcer un provider spécifique
 * const result = await ocrService.processDocumentWithProvider(
 *   buffer, 
 *   DocumentType.INVOICE_PDF, 
 *   'mindee'
 * );
 * 
 * // Avec fallback automatique
 * const result = await ocrService.processDocumentWithFallback(
 *   buffer, 
 *   DocumentType.RECEIPT_IMAGE
 * );
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
    private mindeeProvider: MindeeOcrProvider,
    // Autres providers seront ajoutés ici plus tard
    // private googleVisionProvider: GoogleVisionOcrProvider,
    // private tesseractProvider: TesseractOcrProvider,
  ) {
    // Enregistrer tous les providers disponibles
    this.providers = new Map([
      ['mindee', mindeeProvider],
      // Décommenter quand d'autres providers seront implémentés
      // ['google-vision', googleVisionProvider],
      // ['tesseract', tesseractProvider],
    ]);

    // Lire la configuration
    this.defaultProvider = this.configService.get<OcrProviderType>(
      'OCR_DEFAULT_PROVIDER',
      'mindee',
    );

    this.fallbackEnabled = this.configService.get<boolean>(
      'OCR_ENABLE_FALLBACK',
      false,
    );

    this.logger.log(
      `Service OCR initialisé - Provider par défaut: ${this.defaultProvider}, Fallback: ${this.fallbackEnabled ? 'activé' : 'désactivé'}`,
    );
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
    this.logger.log(
      `Traitement document ${type} avec provider par défaut (${this.defaultProvider})`,
    );

    return this.processDocumentWithProvider(buffer, type, this.defaultProvider);
  }

  /**
   * Traiter un document avec un provider spécifique
   * 
   * @param buffer - Buffer du fichier
   * @param type - Type de document
   * @param providerName - Nom du provider à utiliser
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
        `Provider "${providerName}" non trouvé. Providers disponibles: ${Array.from(this.providers.keys()).join(', ')}`,
      );
    }

    // Vérifier la disponibilité
    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      throw new BadRequestException(
        `Provider "${providerName}" non disponible (vérifier la configuration)`,
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
   * Traiter un document avec fallback automatique
   * 
   * Si le provider principal échoue, essaye automatiquement les autres providers
   * dans l'ordre de priorité défini
   * 
   * @param buffer - Buffer du fichier
   * @param type - Type de document
   * @returns Résultat du traitement
   * 
   * @throws BadRequestException si tous les providers échouent
   */
  async processDocumentWithFallback(
    buffer: Buffer,
    type: DocumentType,
  ): Promise<OcrProcessingResult> {
    if (!this.fallbackEnabled) {
      this.logger.debug('Fallback désactivé, utilisation du provider par défaut uniquement');
      return this.processDocument(buffer, type);
    }

    // Ordre de priorité des providers pour fallback
    const fallbackOrder: OcrProviderType[] = [
      this.defaultProvider,
      // Les autres providers seront essayés si le principal échoue
      // 'google-vision',
      // 'tesseract',
    ].filter((name) => this.providers.has(name));

    this.logger.log(
      `Traitement avec fallback activé - Ordre: ${fallbackOrder.join(' → ')}`,
    );

    const errors: string[] = [];

    // Essayer chaque provider dans l'ordre
    for (const providerName of fallbackOrder) {
      try {
        const provider = this.providers.get(providerName);
        
        // Vérifier disponibilité
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) {
          const error = `${providerName}: non disponible`;
          this.logger.debug(`↷ ${error}`);
          errors.push(error);
          continue;
        }

        // Vérifier support du type
        if (!provider.supportsDocumentType(type)) {
          const error = `${providerName}: type ${type} non supporté`;
          this.logger.debug(`↷ ${error}`);
          errors.push(error);
          continue;
        }

        this.logger.debug(`→ Tentative avec ${providerName}...`);

        // Tenter le traitement
        const result = await provider.processDocument(buffer, type);

        // Si succès, retourner immédiatement
        if (result.success) {
          this.logger.log(
            `✓ Succès avec ${providerName} (${result.processingTime}ms)`,
          );
          return result;
        }

        // Si échec, logger et continuer
        const error = `${providerName}: ${result.error}`;
        this.logger.warn(`✗ ${error}`);
        errors.push(error);
      } catch (error) {
        const errorMsg = `${providerName}: Exception - ${error.message}`;
        this.logger.error(`✗ ${errorMsg}`, error.stack);
        errors.push(errorMsg);
      }
    }

    // Si tous les providers ont échoué
    const errorMessage = `Tous les providers OCR ont échoué:\n${errors.map((e) => `  - ${e}`).join('\n')}`;
    this.logger.error(errorMessage);

    throw new BadRequestException(
      'Impossible de traiter le document avec les providers disponibles',
    );
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

    this.logger.debug(`Providers disponibles: ${available.join(', ') || 'aucun'}`);
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