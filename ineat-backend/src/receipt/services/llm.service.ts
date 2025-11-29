import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/**
 * Suggestion de code EAN pour un produit
 */
export interface EanSuggestion {
  ean: string;
  confidence: number;
  brand: string;
  productName: string;
  image: string | null;
}

/**
 * Produit détecté sur le ticket avec suggestions EAN
 */
export interface DetectedProduct {
  name: string;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  confidence: number;
  suggestedEans: EanSuggestion[];
}

/**
 * Résultat de l'analyse LLM d'un ticket
 */
export interface LlmReceiptAnalysis {
  merchantName: string | null;
  purchaseDate: string | null;
  totalAmount: number | null;
  products: DetectedProduct[];
  confidence: number;
}

/**
 * Structure JSON attendue du LLM (pour validation interne)
 */
interface LlmJsonResponse {
  merchantName?: string | null;
  purchaseDate?: string | null;
  totalAmount?: number | null;
  confidence?: number;
  products: Array<{
    name: string;
    quantity?: number | null;
    unitPrice?: number | null;
    totalPrice?: number | null;
    confidence?: number;
    suggestedEans: Array<{
      ean: string;
      confidence?: number;
      brand?: string;
      productName?: string;
      image?: string | null;
    }>;
  }>;
}

/**
 * Structure d'un item de contenu texte dans la réponse OpenAI
 */
interface TextContentItem {
  type: 'text';
  text: string;
}

/**
 * Structure d'un item output dans la réponse OpenAI Responses API
 */
interface OutputItem {
  type: string;
  text?: string;
  content?: Array<{ type: string; text?: string }>;
}

/**
 * Service d'analyse de tickets via LLM (OpenAI avec prompt pré-configuré)
 *
 * Utilise un prompt OpenAI pré-configuré avec accès internet pour analyser
 * le texte brut extrait par Tesseract et suggérer des codes EAN vérifiés
 * en temps réel sur OpenFoodFacts.
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
  private readonly openai: OpenAI | null = null;
  private readonly promptId: string | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const promptId = this.configService.get<string>('TICKET_PROMPT_ID');

    if (!apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY non configurée - Service LLM indisponible',
      );
      return;
    }

    if (!promptId) {
      this.logger.warn(
        'TICKET_PROMPT_ID non configuré - Service LLM indisponible',
      );
      return;
    }

    this.openai = new OpenAI({ apiKey });
    this.promptId = promptId;
    this.logger.log(
      `Service LLM initialisé avec succès (Prompt ID: ${promptId})`,
    );
  }

  /**
   * Vérifie si le service LLM est disponible
   */
  isAvailable(): boolean {
    return this.openai !== null && this.promptId !== null;
  }

  /**
   * Analyse le texte d'un ticket et suggère des codes EAN pour chaque produit
   *
   * Utilise un prompt OpenAI pré-configuré avec accès internet pour des suggestions
   * d'EAN fiables et vérifiées sur OpenFoodFacts.
   *
   * @param receiptText - Texte brut extrait par OCR
   * @returns Analyse structurée avec suggestions d'EAN
   * @throws Error si le service n'est pas disponible ou si l'analyse échoue
   */
  async analyzeReceiptText(receiptText: string): Promise<LlmReceiptAnalysis> {
    const startTime = Date.now();

    if (!this.openai || !this.promptId) {
      throw new Error(
        'Service LLM non disponible - Configuration manquante (OPENAI_API_KEY ou TICKET_PROMPT_ID)',
      );
    }

    this.logger.log(
      `Analyse du ticket avec prompt OpenAI (ID: ${this.promptId})...`,
    );
    this.logger.debug(`Texte à analyser: ${receiptText.length} caractères`);

    try {
      const response = await this.openai.responses.create({
        prompt: {
          id: this.promptId,
          version: '2',
        },
        input: [
          {
            role: 'user',
            content: receiptText,
          },
        ],
      });

      const processingTime = Date.now() - startTime;

      // Extraire le texte de la réponse
      const responseText = this.extractResponseText(response.output);

      this.logger.log(`Analyse LLM terminée en ${processingTime}ms`);

      // Parser et valider la réponse JSON
      const analysis = this.parseAndValidateResponse(responseText);

      this.logger.log(
        `${analysis.products.length} produits détectés avec suggestions EAN`,
      );

      return analysis;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Erreur lors de l'analyse LLM (${processingTime}ms)`, {
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw new Error(
        `Erreur analyse LLM: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      );
    }
  }

  /**
   * Extrait le texte de la réponse OpenAI Responses API
   */
  private extractResponseText(output: unknown): string {
    if (!output || !Array.isArray(output) || output.length === 0) {
      throw new Error('Réponse vide du LLM - output vide ou invalide');
    }

    const outputItem = output[0] as OutputItem;

    // Cas 1: Texte direct dans outputItem.text
    if (outputItem.text && typeof outputItem.text === 'string') {
      return outputItem.text;
    }

    // Cas 2: Contenu dans outputItem.content (tableau)
    if (outputItem.content && Array.isArray(outputItem.content)) {
      const textContent = outputItem.content.find(
        (item): item is TextContentItem =>
          item.type === 'text' && typeof item.text === 'string',
      );

      if (textContent) {
        return textContent.text;
      }
    }

    // Cas 3: Essayer de sérialiser l'output pour debug
    this.logger.error('Format de réponse non reconnu', {
      outputItem: JSON.stringify(outputItem).substring(0, 500),
    });

    throw new Error('Format de réponse LLM non reconnu');
  }

  /**
   * Parse et valide la réponse JSON du LLM
   */
  private parseAndValidateResponse(responseText: string): LlmReceiptAnalysis {
    // Nettoyer le texte (enlever les éventuels backticks markdown)
    const cleanedText = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed: LlmJsonResponse;

    try {
      parsed = JSON.parse(cleanedText) as LlmJsonResponse;
    } catch (parseError) {
      this.logger.error('Erreur de parsing JSON', {
        responseText: cleanedText.substring(0, 500),
      });
      throw new Error('Réponse LLM non valide: JSON malformé');
    }

    // Validation de la structure
    if (!parsed.products || !Array.isArray(parsed.products)) {
      throw new Error(
        'Structure JSON invalide: champ "products" manquant ou invalide',
      );
    }

    // Validation et normalisation des produits
    const validatedProducts: DetectedProduct[] = [];

    for (const product of parsed.products) {
      if (!product.name || typeof product.name !== 'string') {
        this.logger.warn('Produit ignoré: champ "name" manquant');
        continue;
      }

      if (!product.suggestedEans || !Array.isArray(product.suggestedEans)) {
        this.logger.warn(
          `Produit "${product.name}": suggestedEans manquant, ajout avec tableau vide`,
        );
        product.suggestedEans = [];
      }

      // Filtrer et valider les EAN
      const validEans: EanSuggestion[] = product.suggestedEans
        .filter((ean) => {
          if (!ean.ean || typeof ean.ean !== 'string') {
            return false;
          }
          // Validation EAN13 : exactement 13 chiffres
          if (!/^\d{13}$/.test(ean.ean)) {
            this.logger.warn(
              `EAN invalide pour "${product.name}": ${ean.ean} (ignoré)`,
            );
            return false;
          }
          return true;
        })
        .map((ean) => ({
          ean: ean.ean,
          confidence: this.normalizeConfidence(ean.confidence),
          brand: ean.brand ?? '-',
          productName: ean.productName ?? product.name,
          image: ean.image ?? null,
        }));

      validatedProducts.push({
        name: product.name,
        quantity: product.quantity ?? null,
        unitPrice: product.unitPrice ?? null,
        totalPrice: product.totalPrice ?? null,
        confidence: this.normalizeConfidence(product.confidence),
        suggestedEans: validEans,
      });
    }

    return {
      merchantName: parsed.merchantName ?? null,
      purchaseDate: parsed.purchaseDate ?? null,
      totalAmount:
        typeof parsed.totalAmount === 'number' ? parsed.totalAmount : null,
      products: validatedProducts,
      confidence: this.normalizeConfidence(parsed.confidence),
    };
  }

  /**
   * Normalise un score de confiance entre 0 et 1
   */
  private normalizeConfidence(value: number | undefined): number {
    if (typeof value !== 'number' || isNaN(value)) {
      return 0.5;
    }
    return Math.max(0, Math.min(1, value));
  }
}
