import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/**
 * Suggestion de code EAN pour un produit
 */
export interface EanSuggestion {
  ean: string; // Code EAN13
  confidence: number; // 0-1
  brand: string; // Marque du produit
  productName: string; // Nom complet du produit
}

/**
 * Produit détecté sur le ticket avec suggestions EAN
 */
export interface DetectedProduct {
  name: string; // Nom extrait du ticket (brut)
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  suggestedEans: EanSuggestion[]; // 3-5 suggestions d'EAN
}

/**
 * Résultat de l'analyse LLM d'un ticket
 */
export interface LlmReceiptAnalysis {
  merchantName: string | null;
  purchaseDate: string | null; // ISO string
  totalAmount: number | null;
  products: DetectedProduct[];
  confidence: number; // Confiance globale 0-1
}

/**
 * Service d'analyse de tickets via LLM
 *
 * Utilise un prompt OpenAI pré-configuré avec accès internet pour analyser
 * le texte brut extrait par Tesseract et suggérer des codes EAN vérifiés.
 *
 * Le prompt est configuré dans l'éditeur de prompt OpenAI et a accès à internet
 * pour vérifier les codes EAN en temps réel, garantissant des suggestions fiables.
 *
 * Configuration requise :
 * - OPENAI_API_KEY : Clé API OpenAI
 * - TICKET_PROMPT_ID : ID du prompt configuré dans l'éditeur OpenAI
 *
 * @example
 * ```typescript
 * const analysis = await llmService.analyzeReceiptText(extractedText);
 * // analysis.products[0].suggestedEans = [{ ean: '301...', confidence: 0.9, ... }]
 * ```
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY non configurée - Service LLM indisponible',
      );
    } else {
      this.openai = new OpenAI({ apiKey });

      const promptId = this.configService.get<string>('TICKET_PROMPT_ID');
      if (promptId) {
        this.logger.log(
          `Service LLM initialisé avec succès (Prompt ID: ${promptId})`,
        );
      } else {
        this.logger.warn(
          'TICKET_PROMPT_ID non configuré - Le service ne fonctionnera pas',
        );
      }
    }
  }

  /**
   * Vérifie si le service LLM est disponible
   */
  isAvailable(): boolean {
    return (
      !!this.configService.get<string>('OPENAI_API_KEY') &&
      !!this.configService.get<string>('TICKET_PROMPT_ID')
    );
  }

  /**
   * Analyse le texte d'un ticket et suggère des codes EAN pour chaque produit
   *
   * Utilise un prompt OpenAI pré-configuré avec accès internet pour des suggestions
   * d'EAN fiables et vérifiables.
   *
   * @param receiptText - Texte brut extrait par OCR
   * @returns Analyse structurée avec suggestions d'EAN
   */
  async analyzeReceiptText(receiptText: string): Promise<LlmReceiptAnalysis> {
    const startTime = Date.now();

    if (!this.isAvailable()) {
      throw new Error('Service LLM non disponible - OPENAI_API_KEY manquante');
    }

    const promptId = this.configService.get<string>('TICKET_PROMPT_ID');
    if (!promptId) {
      throw new Error('TICKET_PROMPT_ID non configuré dans .env');
    }

    this.logger.log(
      `Analyse du ticket avec prompt OpenAI (ID: ${promptId})...`,
    );
    this.logger.debug(`Texte à analyser: ${receiptText.length} caractères`);

    try {
      // Utiliser l'API Responses avec le prompt pré-configuré
      // CORRECTION 1: L'input doit être un tableau de messages
      const response = await this.openai.responses.create({
        prompt: {
          id: promptId,
          version: '2',
        },
        // Format correct pour l'API Responses : tableau de messages
        input: [
          {
            role: 'user',
            content: receiptText,
          },
        ],
      });

      const processingTime = Date.now() - startTime;

      // CORRECTION 2: Accès correct à la réponse
      // L'output est un tableau d'items, chaque item peut avoir du contenu
      const outputItem = response.output?.[0];
      if (!outputItem) {
        throw new Error('Réponse vide du LLM - output vide');
      }

      // Extraire le texte selon le type de contenu
      let responseText: unknown;
      if ('text' in outputItem && outputItem.text) {
        responseText = outputItem.text;
      } else if ('content' in outputItem && Array.isArray(outputItem.content)) {
        // Si le contenu est un tableau, chercher le premier élément texte
        const textContent = outputItem.content.find(
          (item: { type: string }) => item.type === 'text',
        );
        if (textContent && 'text' in textContent) {
          responseText = (textContent as { text: string }).text;
        } else {
          throw new Error('Aucun contenu texte trouvé dans la réponse');
        }
      } else {
        throw new Error('Format de réponse non reconnu');
      }

      this.logger.log(`Analyse LLM terminée en ${processingTime}ms`);

      // Parser la réponse JSON
      const analysis = this.parseResponse(responseText as string);

      this.logger.log(`${analysis.products.length} produits détectés`);

      return analysis;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error("Erreur lors de l'analyse LLM", error);

      throw new Error(
        `Erreur analyse LLM (${processingTime}ms): ${
          error instanceof Error ? error.message : 'Erreur inconnue'
        }`,
      );
    }
  }

  /**
   * Parse et valide la réponse JSON du LLM
   */
  private parseResponse(responseText: string): LlmReceiptAnalysis {
    try {
      const parsed = JSON.parse(responseText);

      // Validation basique de la structure
      if (!parsed.products || !Array.isArray(parsed.products)) {
        throw new Error(
          'Structure JSON invalide: products manquant ou invalide',
        );
      }

      // Validation de chaque produit
      for (const product of parsed.products) {
        if (!product.name || typeof product.name !== 'string') {
          throw new Error('Produit invalide: name manquant');
        }

        if (!product.suggestedEans || !Array.isArray(product.suggestedEans)) {
          throw new Error(
            `Produit "${product.name}": suggestedEans manquant ou invalide`,
          );
        }

        // Validation des EAN
        for (const ean of product.suggestedEans) {
          if (!ean.ean || !/^\d{13}$/.test(ean.ean)) {
            this.logger.warn(
              `EAN invalide pour "${product.name}": ${ean.ean} (ignoré)`,
            );
            // On filtre les EAN invalides
            product.suggestedEans = product.suggestedEans.filter(
              (e: EanSuggestion) => e.ean && /^\d{13}$/.test(e.ean),
            );
          }
        }
      }

      return {
        merchantName: parsed.merchantName || null,
        purchaseDate: parsed.purchaseDate || null,
        totalAmount: parsed.totalAmount || null,
        products: parsed.products,
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      this.logger.error('Erreur lors du parsing de la réponse LLM', error);
      throw new Error(
        `Parsing JSON échoué: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      );
    }
  }
}
