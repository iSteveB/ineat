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
 * Structure d'un item de contenu output_text dans la réponse OpenAI
 */
interface OutputTextContentItem {
  type: 'output_text';
  text: string;
  annotations?: unknown[];
  logprobs?: unknown[];
}

/**
 * Structure d'un item output dans la réponse OpenAI Responses API
 */
interface OutputItem {
  type: string;
  text?: string;
  content?: Array<TextContentItem | OutputTextContentItem>;
  // Support du type "reasoning" qui précède la réponse finale
  summary?: unknown;
  // Support du type "message" avec statut
  status?: string;
  role?: string;
}

/**
 * Service d'analyse de tickets via LLM (OpenAI, extraction rapide)
 *
 * Utilise un prompt local sans outil web pour analyser le texte brut extrait
 * par OCR. L'enrichissement EAN est volontairement séparé du LLM pour éviter
 * les appels longs et non bornés.
 *
 * Configuration requise :
 * - OPENAI_API_KEY : Clé API OpenAI
 * - OPENAI_RECEIPT_MODEL : modèle optionnel (défaut: gpt-4.1-mini)
 *
 * @example
 * ```typescript
 * const analysis = await llmService.analyzeReceiptText(extractedText);
 * // analysis.products[0].name = 'Orangina'
 * ```
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly openai: OpenAI | null = null;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY non configurée - Service LLM indisponible',
      );
      return;
    }

    this.openai = new OpenAI({ apiKey });
    this.model =
      this.configService.get<string>('OPENAI_RECEIPT_MODEL') || 'gpt-4.1-mini';
    this.timeoutMs =
      Number(this.configService.get<string>('OPENAI_RECEIPT_TIMEOUT_MS')) ||
      15000;

    this.logger.log(
      `Service LLM initialisé avec succès (modèle: ${this.model}, timeout: ${this.timeoutMs}ms)`,
    );
  }

  /**
   * Vérifie si le service LLM est disponible
   */
  isAvailable(): boolean {
    return this.openai !== null;
  }

  /**
   * Analyse le texte d'un ticket et extrait les produits détectés
   *
   * Utilise un prompt sans outils externes. Les suggestions EAN sont enrichies
   * par un service dédié et borné en temps.
   *
   * @param receiptText - Texte brut extrait par OCR
   * @returns Analyse structurée sans enrichissement externe
   * @throws Error si le service n'est pas disponible ou si l'analyse échoue
   */
  async analyzeReceiptText(receiptText: string): Promise<LlmReceiptAnalysis> {
    const startTime = Date.now();

    if (!this.openai) {
      throw new Error(
        'Service LLM non disponible - Configuration manquante (OPENAI_API_KEY)',
      );
    }

    this.logger.log(`Analyse rapide du ticket avec OpenAI (${this.model})...`);
    this.logger.debug(`Texte à analyser: ${receiptText.length} caractères`);

    try {
      const response = await this.openai.responses.create(
        {
          model: this.model,
          input: this.buildFastExtractionPrompt(receiptText),
          max_output_tokens: 1800,
          temperature: 0,
          text: {
            format: {
              type: 'json_object',
            },
          },
        } as any,
        {
          timeout: this.timeoutMs,
        },
      );

      const processingTime = Date.now() - startTime;

      // Extraire le texte de la réponse
      const responseText =
        (response as any).output_text ||
        this.extractResponseText(response.output);

      this.logger.log(`Analyse LLM rapide terminée en ${processingTime}ms`);

      // Parser et valider la réponse JSON
      const analysis = this.parseAndValidateResponse(responseText);

      this.logger.log(`${analysis.products.length} produits détectés`);

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
   * Prompt volontairement court et sans recherche externe.
   */
  private buildFastExtractionPrompt(receiptText: string): string {
    return `Tu extrais les données structurées d'un ticket de caisse OCR français.

Contraintes:
- N'utilise aucune recherche externe.
- Retourne uniquement un objet JSON valide.
- Détecte les lignes produits alimentaires uniquement.
- Ignore les lignes de paiement, taxes, TVA, carte bancaire, ticket, fidélité, totaux intermédiaires, remises isolées.
- Garde les libellés produits courts et lisibles.
- suggestedEans doit toujours être un tableau vide; l'enrichissement EAN est fait après.
- Si une information est absente ou incertaine, mets null.

Format:
{
  "merchantName": string | null,
  "purchaseDate": string | null,
  "totalAmount": number | null,
  "confidence": number,
  "products": [
    {
      "name": string,
      "quantity": number | null,
      "unitPrice": number | null,
      "totalPrice": number | null,
      "confidence": number,
      "suggestedEans": []
    }
  ]
}

Texte OCR:
${receiptText}`;
  }

  /**
   * Extrait le texte de la réponse OpenAI Responses API
   */
  private extractResponseText(output: unknown): string {
    if (!output || !Array.isArray(output) || output.length === 0) {
      throw new Error('Réponse vide du LLM - output vide ou invalide');
    }

    // L'API peut retourner plusieurs items: [reasoning, web_search_call, reasoning, message]
    // On cherche le premier item de type "message" avec du contenu
    for (const item of output) {
      const outputItem = item as OutputItem;

      // Skip les items de type "reasoning" et "web_search_call"
      if (
        outputItem.type === 'reasoning' ||
        outputItem.type === 'web_search_call'
      ) {
        this.logger.debug(`Item de type ${outputItem.type} ignoré`);
        continue;
      }

      // Cas spécifique: Type "message" avec content array
      if (
        outputItem.type === 'message' &&
        outputItem.content &&
        Array.isArray(outputItem.content)
      ) {
        // Chercher un item de type "output_text" dans content
        const outputText = outputItem.content.find(
          (contentItem): contentItem is OutputTextContentItem =>
            contentItem.type === 'output_text' &&
            typeof contentItem.text === 'string',
        );

        if (outputText) {
          return outputText.text;
        }
      }

      // Cas 1: Texte direct dans outputItem.text
      if (outputItem.text && typeof outputItem.text === 'string') {
        return outputItem.text;
      }

      // Cas 2: Contenu dans outputItem.content (tableau) - ancien format
      if (outputItem.content && Array.isArray(outputItem.content)) {
        const textContent = outputItem.content.find(
          (contentItem): contentItem is TextContentItem =>
            contentItem.type === 'text' && typeof contentItem.text === 'string',
        );

        if (textContent) {
          return textContent.text;
        }
      }
    }

    // Aucun texte trouvé dans tous les items
    this.logger.error('Format de réponse non reconnu', {
      outputItem: JSON.stringify(output[0]).substring(0, 500),
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
