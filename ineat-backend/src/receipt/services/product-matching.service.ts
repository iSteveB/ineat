/**
 * Service de matching de produits
 *
 * Service responsable de faire correspondre les items détectés sur un ticket
 * avec les produits existants dans la base de données
 *
 * @module receipt/services/product-matching.service
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OcrLineItem } from '../interfaces/ocr-provider.interface';
import {
  levenshteinDistance,
  normalizeString,
} from '../utils/string-similarity';

/**
 * Résultat du matching pour un item
 */
export interface ProductMatchResult {
  /** Item original du ticket */
  originalItem: OcrLineItem;

  /** Produits correspondants trouvés */
  matches: ProductMatch[];

  /** Meilleur match (score le plus élevé) */
  bestMatch: ProductMatch | null;

  /** Suggestion de catégorie basée sur le nom */
  suggestedCategory: string | null;

  /** Statut du matching */
  status: 'EXACT_MATCH' | 'GOOD_MATCH' | 'POSSIBLE_MATCH' | 'NO_MATCH';
}

/**
 * Match individuel avec un produit
 */
export interface ProductMatch {
  /** Produit correspondant */
  product: {
    id: string;
    name: string;
    brand: string | null;
    barcode: string | null;
    categoryId: string;
    imageUrl: string | null;
  };

  /** Score de correspondance (0-1) */
  score: number;

  /** Type de correspondance */
  matchType:
    | 'EXACT_NAME'
    | 'EXACT_BARCODE'
    | 'FUZZY_NAME'
    | 'KEYWORD'
    | 'BRAND';

  /** Détails de la correspondance */
  matchDetails: {
    /** Partie du nom qui correspond */
    matchedText?: string;

    /** Distance de Levenshtein pour fuzzy match */
    editDistance?: number;

    /** Mots-clés correspondants */
    matchedKeywords?: string[];
  };
}

/**
 * Configuration du matching
 */
interface MatchingConfig {
  /** Score minimum pour considérer un match valide */
  minScore: number;

  /** Score minimum pour un "bon" match */
  goodMatchThreshold: number;

  /** Score pour un match exact */
  exactMatchThreshold: number;

  /** Distance de Levenshtein maximale pour fuzzy matching */
  maxEditDistance: number;

  /** Nombre maximum de résultats à retourner */
  maxResults: number;
}

/**
 * Service de matching de produits
 *
 * Ce service utilise plusieurs algorithmes pour faire correspondre
 * les items d'un ticket avec les produits de la base de données :
 *
 * 1. **Correspondance exacte** : nom ou code-barres identique
 * 2. **Correspondance floue** : similarité de chaînes (Levenshtein)
 * 3. **Correspondance par mots-clés** : mots communs
 * 4. **Correspondance par marque** : si la marque est détectée
 *
 * @example
 * ```typescript
 * const result = await matching.matchLineItem(item);
 *
 * if (result.status === 'EXACT_MATCH') {
 *   console.log('Correspondance parfaite trouvée !');
 * }
 *
 * // Utiliser le meilleur match
 * if (result.bestMatch && result.bestMatch.score > 0.8) {
 *   const product = result.bestMatch.product;
 *   console.log(`Produit suggéré: ${product.name}`);
 * }
 * ```
 */
@Injectable()
export class ProductMatchingService {
  private readonly logger = new Logger(ProductMatchingService.name);

  /** Configuration par défaut */
  private readonly config: MatchingConfig = {
    minScore: 0.3,
    goodMatchThreshold: 0.7,
    exactMatchThreshold: 0.95,
    maxEditDistance: 3,
    maxResults: 10,
  };

  /** Cache des mots vides à ignorer */
  private readonly stopWords = new Set([
    'le',
    'la',
    'les',
    'un',
    'une',
    'des',
    'du',
    'de',
    'et',
    'ou',
    'avec',
    'sans',
    'bio',
    'frais',
    'surgelé',
    'surgelée',
    'kg',
    'g',
    'l',
    'ml',
    'pièce',
    'pc',
    'unité',
    'lot',
    'pack',
    'x',
  ]);

  constructor(private prisma: PrismaService) {}

  /**
   * Matcher un item de ticket avec les produits de la base
   *
   * @param item - Item à matcher
   * @returns Résultat du matching
   */
  async matchLineItem(item: OcrLineItem): Promise<ProductMatchResult> {
    this.logger.debug(`Matching item: "${item.description}"`);

    try {
      // 1. Chercher correspondance exacte par code-barres (si disponible)
      const barcodeMatches = item.productCode
        ? await this.findByBarcode(item.productCode)
        : [];

      // 2. Chercher correspondance exacte par nom
      const exactNameMatches = await this.findByExactName(item.description);

      // 3. Chercher correspondance floue par nom
      const fuzzyMatches = await this.findByFuzzyName(item.description);

      // 4. Chercher par mots-clés
      const keywordMatches = await this.findByKeywords(item.description);

      // 5. Combiner tous les résultats
      const allMatches = [
        ...barcodeMatches,
        ...exactNameMatches,
        ...fuzzyMatches,
        ...keywordMatches,
      ];

      // 6. Dédupliquer et trier par score
      const uniqueMatches = this.deduplicateMatches(allMatches);
      const sortedMatches = uniqueMatches
        .filter((match) => match.score >= this.config.minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, this.config.maxResults);

      // 7. Déterminer le meilleur match
      const bestMatch = sortedMatches[0] || null;

      // 8. Déterminer le statut
      const status = this.determineMatchStatus(bestMatch);

      // 9. Suggérer une catégorie
      const suggestedCategory = await this.suggestCategory(
        item.description,
        bestMatch,
      );

      const result: ProductMatchResult = {
        originalItem: item,
        matches: sortedMatches,
        bestMatch,
        suggestedCategory,
        status,
      };

      this.logger.debug(
        `Matching terminé: ${sortedMatches.length} matches, meilleur score: ${bestMatch?.score?.toFixed(2) || 'N/A'}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Erreur matching item "${item.description}": ${error.message}`,
      );

      return {
        originalItem: item,
        matches: [],
        bestMatch: null,
        suggestedCategory: null,
        status: 'NO_MATCH',
      };
    }
  }

  /**
   * Matcher plusieurs items en lot
   */
  async matchMultipleItems(
    items: OcrLineItem[],
  ): Promise<ProductMatchResult[]> {
    this.logger.log(`Matching de ${items.length} items`);

    const results: ProductMatchResult[] = [];

    for (const item of items) {
      const result = await this.matchLineItem(item);
      results.push(result);
    }

    return results;
  }

  /**
   * Recherche par code-barres
   */
  private async findByBarcode(barcode: string): Promise<ProductMatch[]> {
    const products = await this.prisma.product.findMany({
      where: {
        barcode: barcode,
      },
      select: {
        id: true,
        name: true,
        brand: true,
        barcode: true,
        categoryId: true,
        imageUrl: true,
      },
    });

    return products.map((product) => ({
      product,
      score: 1.0, // Match parfait
      matchType: 'EXACT_BARCODE' as const,
      matchDetails: {
        matchedText: barcode,
      },
    }));
  }

  /**
   * Recherche par nom exact
   */
  private async findByExactName(description: string): Promise<ProductMatch[]> {
    const normalizedDescription = normalizeString(description);

    const products = await this.prisma.product.findMany({
      where: {
        OR: [
          {
            name: {
              equals: normalizedDescription,
              mode: 'insensitive',
            },
          },
          {
            name: {
              equals: description,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        brand: true,
        barcode: true,
        categoryId: true,
        imageUrl: true,
      },
    });

    return products.map((product) => ({
      product,
      score: 0.98, // Presque parfait
      matchType: 'EXACT_NAME' as const,
      matchDetails: {
        matchedText: description,
      },
    }));
  }

  /**
   * Recherche floue par nom
   */
  private async findByFuzzyName(description: string): Promise<ProductMatch[]> {
    const normalizedDescription = normalizeString(description);
    const keywords = this.extractKeywords(normalizedDescription);

    if (keywords.length === 0) return [];

    // Rechercher les produits contenant au moins un mot-clé
    const products = await this.prisma.product.findMany({
      where: {
        OR: keywords.map((keyword) => ({
          name: {
            contains: keyword,
            mode: 'insensitive' as const,
          },
        })),
      },
      select: {
        id: true,
        name: true,
        brand: true,
        barcode: true,
        categoryId: true,
        imageUrl: true,
      },
    });

    // Calculer le score de similarité pour chaque produit
    const matches: ProductMatch[] = [];

    for (const product of products) {
      const productName = normalizeString(product.name);
      const editDistance = levenshteinDistance(
        normalizedDescription,
        productName,
      );

      // Score basé sur la distance d'édition
      const maxLength = Math.max(
        normalizedDescription.length,
        productName.length,
      );
      const similarity = 1 - editDistance / maxLength;

      // Bonus si les mots-clés correspondent
      const productKeywords = this.extractKeywords(productName);
      const commonKeywords = keywords.filter((k) =>
        productKeywords.includes(k),
      );
      const keywordBonus =
        (commonKeywords.length / Math.max(keywords.length, 1)) * 0.3;

      const finalScore = Math.min(0.95, similarity + keywordBonus);

      if (
        finalScore >= this.config.minScore &&
        editDistance <= this.config.maxEditDistance
      ) {
        matches.push({
          product,
          score: finalScore,
          matchType: 'FUZZY_NAME',
          matchDetails: {
            matchedText: product.name,
            editDistance,
            matchedKeywords: commonKeywords,
          },
        });
      }
    }

    return matches;
  }

  /**
   * Recherche par mots-clés
   */
  private async findByKeywords(description: string): Promise<ProductMatch[]> {
    const keywords = this.extractKeywords(normalizeString(description));

    if (keywords.length === 0) return [];

    // Rechercher dans nom et marque seulement
    const products = await this.prisma.product.findMany({
      where: {
        OR: [
          ...keywords.map((keyword) => ({
            name: {
              contains: keyword,
              mode: 'insensitive' as const,
            },
          })),
          ...keywords.map((keyword) => ({
            brand: {
              contains: keyword,
              mode: 'insensitive' as const,
            },
          })),
        ],
      },
      select: {
        id: true,
        name: true,
        brand: true,
        barcode: true,
        categoryId: true,
        imageUrl: true,
      },
    });

    // Calculer le score basé sur les mots-clés correspondants
    const matches: ProductMatch[] = [];

    for (const product of products) {
      const productText =
        `${product.name} ${product.brand || ''}`.toLowerCase();
      const matchedKeywords = keywords.filter((keyword) =>
        productText.includes(keyword.toLowerCase()),
      );

      if (matchedKeywords.length > 0) {
        const score = Math.min(
          0.9,
          (matchedKeywords.length / keywords.length) * 0.8,
        );

        matches.push({
          product,
          score,
          matchType: 'KEYWORD',
          matchDetails: {
            matchedKeywords,
          },
        });
      }
    }

    return matches;
  }

  /**
   * Extraire les mots-clés d'une description
   */
  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.replace(/[^\w]/g, '')) // Supprimer ponctuation
      .filter((word) => word.length >= 3) // Mots d'au moins 3 caractères
      .filter((word) => !this.stopWords.has(word)) // Exclure mots vides
      .filter((word) => !/^\d+$/.test(word)); // Exclure nombres purs
  }

  /**
   * Dédupliquer les matches par produit
   */
  private deduplicateMatches(matches: ProductMatch[]): ProductMatch[] {
    const seen = new Map<string, ProductMatch>();

    for (const match of matches) {
      const existing = seen.get(match.product.id);

      if (!existing || match.score > existing.score) {
        seen.set(match.product.id, match);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Déterminer le statut du matching
   */
  private determineMatchStatus(
    bestMatch: ProductMatch | null,
  ): ProductMatchResult['status'] {
    if (!bestMatch) return 'NO_MATCH';

    if (bestMatch.score >= this.config.exactMatchThreshold) {
      return 'EXACT_MATCH';
    }

    if (bestMatch.score >= this.config.goodMatchThreshold) {
      return 'GOOD_MATCH';
    }

    return 'POSSIBLE_MATCH';
  }

  /**
   * Suggérer une catégorie basée sur le nom
   */
  private async suggestCategory(
    description: string,
    bestMatch: ProductMatch | null,
  ): Promise<string | null> {
    // Si on a un bon match, récupérer sa catégorie depuis la base
    if (bestMatch && bestMatch.score > 0.7) {
      try {
        const category = await this.prisma.category.findUnique({
          where: { id: bestMatch.product.categoryId },
          select: { name: true },
        });

        if (category) {
          return category.name;
        }
      } catch (error) {
        this.logger.warn(`Erreur récupération catégorie: ${error.message}`);
      }
    }

    // Sinon, essayer de deviner la catégorie par mots-clés
    const text = description.toLowerCase();

    // Patterns de catégories courantes
    const categoryPatterns = {
      'Fruits et légumes': /pomme|banane|tomate|carotte|salade|légume|fruit/,
      'Viande et poisson': /viande|porc|bœuf|poulet|poisson|saumon|jambon/,
      'Produits laitiers': /lait|fromage|yaourt|beurre|crème|dairy/,
      'Pain et pâtisserie': /pain|baguette|croissant|pâtisserie|brioche/,
      Boissons: /eau|jus|soda|bière|vin|boisson/,
      Surgelés: /surgelé|congelé|frozen/,
      Épicerie: /riz|pâtes|conserve|sauce|huile/,
    };

    for (const [category, pattern] of Object.entries(categoryPatterns)) {
      if (pattern.test(text)) {
        return category;
      }
    }

    return null;
  }

  /**
   * Obtenir des statistiques de matching
   */
  getMatchingStats(results: ProductMatchResult[]): Record<string, any> {
    const totalItems = results.length;
    const exactMatches = results.filter(
      (r) => r.status === 'EXACT_MATCH',
    ).length;
    const goodMatches = results.filter((r) => r.status === 'GOOD_MATCH').length;
    const possibleMatches = results.filter(
      (r) => r.status === 'POSSIBLE_MATCH',
    ).length;
    const noMatches = results.filter((r) => r.status === 'NO_MATCH').length;

    const avgScore =
      results
        .filter((r) => r.bestMatch)
        .reduce((sum, r) => sum + r.bestMatch!.score, 0) /
      Math.max(1, results.filter((r) => r.bestMatch).length);

    return {
      totalItems,
      exactMatches,
      goodMatches,
      possibleMatches,
      noMatches,
      matchRate: (exactMatches + goodMatches) / totalItems,
      avgScore,
    };
  }
}
