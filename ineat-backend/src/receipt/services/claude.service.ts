import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Service Claude avec MCP Connector pour OpenFoodFacts
 *
 * Utilise le MCP distant déployé sur Railway pour accéder
 * aux outils OpenFoodFacts directement depuis l'API Claude
 */
@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly anthropic: Anthropic | null = null;
  private readonly mcpServerUrl: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    const mcpUrl = this.configService.get<string>('MCP_OPENFOODFACTS_URL');

    if (!apiKey) {
      this.logger.warn(
        'ANTHROPIC_API_KEY non configurée - Service Claude indisponible',
      );
      return;
    }

    if (!mcpUrl) {
      this.logger.warn(
        'MCP_OPENFOODFACTS_URL non configurée - MCP indisponible',
      );
      this.mcpServerUrl = '';
      return;
    }

    this.anthropic = new Anthropic({ apiKey });
    this.mcpServerUrl = mcpUrl;
    this.logger.log('Service Claude avec MCP Connector initialisé');
    this.logger.log(`MCP Server: ${this.mcpServerUrl}`);
  }

  /**
   * Vérifie si le service Claude est disponible
   */
  isAvailable(): boolean {
    return this.anthropic !== null && this.mcpServerUrl !== '';
  }

  /**
   * Analyse le texte OCR d'un ticket avec Claude + MCP OpenFoodFacts
   *
   * Le MCP permet à Claude de :
   * - Chercher des produits sur OpenFoodFacts
   * - Récupérer des détails par code EAN
   * - Explorer itérativement pour affiner les résultats
   */
  async analyzeReceiptText(receiptText: string) {
    const startTime = Date.now();

    if (!this.anthropic) {
      throw new Error(
        'Service Claude non disponible - ANTHROPIC_API_KEY manquante',
      );
    }

    if (!this.mcpServerUrl) {
      throw new Error(
        'MCP Server non configuré - MCP_OPENFOODFACTS_URL manquante',
      );
    }

    this.logger.log('Analyse du ticket avec Claude + MCP OpenFoodFacts...');
    this.logger.debug(`Texte à analyser: ${receiptText.length} caractères`);

    try {
      const response = await this.anthropic.messages.create(
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,

          messages: [
            {
              role: 'user',
              content: this.buildPrompt(receiptText),
            },
          ],

          // Configuration du serveur MCP distant
          // @ts-ignore - SDK TypeScript pas encore à jour pour MCP Connector
          mcp_servers: [
            {
              type: 'url',
              url: this.mcpServerUrl,
              name: 'openfoodfacts',
              // Pas d'authorization_token pour OpenFoodFacts (API publique)
            },
          ],

          // Activer tous les outils OpenFoodFacts
          // @ts-ignore - SDK TypeScript pas encore à jour pour MCP Connector
          tools: [
            {
              type: 'mcp_toolset',
              mcp_server_name: 'openfoodfacts',
              // Tous les outils activés par défaut
            },
          ],
        } as any,
        {
          // En-tête beta pour MCP Connector
          headers: {
            'anthropic-beta': 'mcp-client-2025-11-20',
          },
        },
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(`Analyse Claude + MCP terminée en ${processingTime}ms`);

      // Parser la réponse
      const analysis = this.parseClaudeResponse(response);

      this.logger.log(
        `${analysis.products.length} produits détectés avec suggestions EAN`,
      );

      return analysis;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `Erreur lors de l'analyse Claude + MCP (${processingTime}ms)`,
        {
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          stack: error instanceof Error ? error.stack : undefined,
        },
      );

      throw new Error(
        `Erreur analyse Claude: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      );
    }
  }

  /**
   * Construit le prompt pour Claude
   */
  private buildPrompt(ocrText: string): string {
    return `TEXTE OCR DU TICKET :
${ocrText}

TÂCHE :
Analyse ce ticket de caisse et utilise les outils MCP OpenFoodFacts pour trouver les codes EAN de chaque produit détecté.

INSTRUCTIONS STRICTES :
1. Identifie tous les produits alimentaires dans le texte OCR
2. Pour CHAQUE produit, utilise l'outil searchProducts du MCP pour trouver les codes EAN
3. Nettoie les noms de produits (enlève codes parasites, quantités)
4. Retourne UNIQUEMENT le JSON ci-dessous, RIEN D'AUTRE

FORMAT DE RÉPONSE (JSON UNIQUEMENT, PAS DE TEXTE AVANT OU APRÈS) :
{
  "merchantName": "nom du magasin" ou null,
  "purchaseDate": "YYYY-MM-DDTHH:mm:ss.000Z" ou null,
  "totalAmount": 8.30,
  "confidence": 0.7,
  "products": [
    {
      "name": "ORANGINA",
      "quantity": 4,
      "unitPrice": null,
      "totalPrice": null,
      "confidence": 0.8,
      "suggestedEans": [
        {
          "ean": "3124480169051",
          "confidence": 0.9,
          "brand": "Orangina",
          "productName": "Soda à l'Orange ORANGINA 4x50cl",
          "image": null
        }
      ]
    }
  ]
}

RÈGLES CRITIQUES :
- NE commence PAS par "Je vais analyser", "Voici le résultat", etc.
- NE mets PAS de markdown (pas de \`\`\`json)
- Commence DIRECTEMENT par {
- Termine DIRECTEMENT par }
- Utilise OBLIGATOIREMENT les outils MCP pour chaque produit
- Si aucun EAN trouvé pour un produit, mets suggestedEans: []`;
  }

  /**
   * Parse la réponse de Claude
   */
  private parseClaudeResponse(response: any) {
    // Extraire le texte de la réponse
    const textContent = response.content.find(
      (block: any) => block.type === 'text',
    );

    if (!textContent) {
      this.logger.warn('Pas de contenu texte - vérifier les appels MCP');
      this.logger.debug(
        `Contenu de la réponse: ${JSON.stringify(response.content)}`,
      );
      throw new Error('Pas de contenu texte dans la réponse Claude');
    }

    let rawText = textContent.text.trim();
    this.logger.debug(
      `Réponse brute de Claude: ${rawText.substring(0, 200)}...`,
    );

    // Nettoyer agressivement pour extraire UNIQUEMENT le JSON

    // 1. Enlever les markdown code blocks
    rawText = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '');

    // 2. Trouver le premier { et le dernier }
    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1) {
      this.logger.error(`Pas de JSON trouvé dans la réponse: ${rawText}`);
      throw new Error('Réponse Claude ne contient pas de JSON valide');
    }

    // 3. Extraire uniquement le JSON
    const jsonText = rawText.substring(firstBrace, lastBrace + 1).trim();

    this.logger.debug(`JSON extrait: ${jsonText.substring(0, 200)}...`);

    // Parser
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      this.logger.error(
        `Erreur parsing JSON: ${parseError instanceof Error ? parseError.message : 'Erreur inconnue'}`,
      );
      this.logger.error(`JSON qui a échoué: ${jsonText}`);
      throw new Error(
        `JSON invalide retourné par Claude: ${parseError instanceof Error ? parseError.message : 'Erreur inconnue'}`,
      );
    }

    // Valider et normaliser
    return this.validateAndNormalize(parsed);
  }

  /**
   * Valide et normalise la réponse
   */
  private validateAndNormalize(parsed: any) {
    if (!parsed.products || !Array.isArray(parsed.products)) {
      throw new Error('Structure JSON invalide: champ "products" manquant');
    }

    const validatedProducts = parsed.products
      .filter((p: any) => p.name && typeof p.name === 'string')
      .map((p: any) => ({
        name: p.name,
        quantity: p.quantity ?? null,
        unitPrice: p.unitPrice ?? null,
        totalPrice: p.totalPrice ?? null,
        confidence: this.normalizeConfidence(p.confidence),
        suggestedEans: (p.suggestedEans || [])
          .filter((ean: any) => /^\d{13}$/.test(ean.ean))
          .map((ean: any) => ({
            ean: ean.ean,
            confidence: this.normalizeConfidence(ean.confidence),
            brand: ean.brand ?? '-',
            productName: ean.productName ?? p.name,
            image: ean.image ?? null,
          })),
      }));

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
