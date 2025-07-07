import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductSearchResultDto } from '../../DTOs';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recherche des produits par nom ou marque
   * @param searchTerm Terme de recherche
   * @param limit Nombre maximum de résultats
   * @returns Liste des produits correspondants
   */
  async searchProducts(
    searchTerm: string,
    limit: number = 10,
  ): Promise<ProductSearchResultDto[]> {
    // Nettoyer le terme de recherche
    const cleanedTerm = searchTerm.trim().toLowerCase();

    // Construire les conditions de recherche
    const searchConditions: Prisma.ProductWhereInput = {
      OR: [
        {
          name: {
            contains: cleanedTerm,
            mode: 'insensitive',
          },
        },
        {
          brand: {
            contains: cleanedTerm,
            mode: 'insensitive',
          },
        },
        // Recherche par code-barres si le terme ressemble à un code-barres
        ...(this.looksLikeBarcode(cleanedTerm)
          ? [
              {
                barcode: {
                  equals: cleanedTerm,
                },
              },
            ]
          : []),
      ],
    };

    // Récupérer les produits
    const products = await this.prisma.product.findMany({
      where: searchConditions,
      include: {
        category: true,
      },
      take: limit,
      orderBy: [
        // Prioriser les correspondances exactes
        {
          name: 'asc',
        },
      ],
    });

    // Calculer les scores de pertinence et trier
    const resultsWithScore = products.map((product) => {
      const score = this.calculateRelevanceScore(product, cleanedTerm);
      return {
        ...this.formatProductResult(product),
        relevanceScore: score,
      };
    });

    // Trier par score de pertinence décroissant
    resultsWithScore.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return resultsWithScore;
  }

  /**
   * Récupère un produit par son ID
   * @param productId ID du produit
   * @returns Détails du produit
   */
  async getProductById(productId: string): Promise<ProductSearchResultDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Produit non trouvé');
    }

    return this.formatProductResult(product);
  }

  /**
   * Récupère toutes les catégories
   * @returns Liste des catégories
   */
  async getCategories() {
    return await this.prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Formate un produit pour la réponse API
   */
  private formatProductResult(product: any): ProductSearchResultDto {
    return {
      id: product.id,
      name: product.name,
      brand: product.brand,
      nutriscore: product.nutriscore,
      ecoScore: product.ecoScore,
      imageUrl: product.imageUrl,
      unitType: product.unitType,
      barcode: product.barcode,
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
        icon: product.category.icon,
      },
    };
  }

  /**
   * Calcule un score de pertinence pour le tri des résultats
   */
  private calculateRelevanceScore(product: any, searchTerm: string): number {
    let score = 0;
    const lowerName = product.name.toLowerCase();
    const lowerBrand = product.brand?.toLowerCase() || '';

    // Correspondance exacte du nom : score maximum
    if (lowerName === searchTerm) {
      score += 1.0;
    }
    // Le nom commence par le terme de recherche
    else if (lowerName.startsWith(searchTerm)) {
      score += 0.8;
    }
    // Le nom contient le terme de recherche
    else if (lowerName.includes(searchTerm)) {
      score += 0.6;
    }

    // Correspondance de la marque
    if (lowerBrand === searchTerm) {
      score += 0.5;
    } else if (lowerBrand.startsWith(searchTerm)) {
      score += 0.3;
    } else if (lowerBrand.includes(searchTerm)) {
      score += 0.2;
    }

    // Bonus si le produit a des informations nutritionnelles
    if (product.nutriscore) {
      score += 0.1;
    }
    if (product.ecoScore) {
      score += 0.1;
    }
    if (product.imageUrl) {
      score += 0.05;
    }

    return Math.min(score, 1.0); // Plafonner à 1.0
  }

  /**
   * Vérifie si une chaîne ressemble à un code-barres
   */
  private looksLikeBarcode(str: string): boolean {
    // Un code-barres est généralement composé de 8 à 13 chiffres
    return /^\d{8,13}$/.test(str);
  }

  /**
   * Recherche floue pour améliorer les résultats
   * Utilise la distance de Levenshtein pour trouver des correspondances approximatives
   */
  private async searchWithFuzzyMatching(
    searchTerm: string,
    limit: number = 10,
  ): Promise<ProductSearchResultDto[]> {
    // Pour une recherche floue plus avancée, on pourrait utiliser
    // une extension PostgreSQL comme pg_trgm ou implémenter
    // un algorithme de distance de Levenshtein

    // Pour l'instant, on utilise la recherche basique
    return this.searchProducts(searchTerm, limit);
  }
}
