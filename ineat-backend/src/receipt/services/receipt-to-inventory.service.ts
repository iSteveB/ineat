import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ===== TYPES ET INTERFACES =====

/**
 * Item de ticket validé prêt à être ajouté à l'inventaire
 */
export interface ValidatedReceiptItem {
  /** ID du produit existant ou null si nouveau produit */
  productId?: string;
  /** Informations du produit (pour nouveau produit) */
  productData?: {
    name: string;
    brand?: string;
    barcode?: string;
    categorySlug: string;
    imageUrl?: string;
    unitType: 'KG' | 'G' | 'L' | 'ML' | 'UNIT';
  };
  /** Quantité achetée */
  quantity: number;
  /** Prix unitaire */
  unitPrice?: number;
  /** Prix total pour cette ligne */
  totalPrice?: number;
  /** Date de péremption estimée/saisie */
  expiryDate?: Date;
  /** Lieu de stockage */
  storageLocation?: string;
  /** Notes additionnelles */
  notes?: string;
}

/**
 * Résultat de l'ajout d'un ticket à l'inventaire
 */
export interface ReceiptToInventoryResult {
  /** Items ajoutés avec succès */
  addedItems: {
    id: string;
    productName: string;
    quantity: number;
    totalPrice?: number;
  }[];
  /** Items qui ont échoué */
  failedItems: {
    productName: string;
    error: string;
  }[];
  /** Informations de budget */
  budgetImpact: {
    totalAmount: number;
    expenseCreated: boolean;
    budgetId?: string;
    remainingBudget?: number;
    warningMessage?: string;
  };
  /** Résumé */
  summary: {
    totalItemsProcessed: number;
    successfulItems: number;
    failedItems: number;
    totalAmountSpent: number;
  };
}

/**
 * Options pour l'ajout à l'inventaire
 */
export interface AddReceiptToInventoryOptions {
  /** Date d'achat (par défaut: maintenant) */
  purchaseDate?: Date;
  /** Forcer la création même avec des erreurs */
  forcedAdd?: boolean;
  /** Créer automatiquement les nouveaux produits */
  autoCreateProducts?: boolean;
}

/**
 * Service responsable de l'ajout des items de tickets validés à l'inventaire
 * Gère l'intégration avec le système de budget
 */
@Injectable()
export class ReceiptToInventoryService {
  private readonly logger = new Logger(ReceiptToInventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ajoute tous les items validés d'un ticket à l'inventaire
   */
  async addReceiptItemsToInventory(
    userId: string,
    validatedItems: ValidatedReceiptItem[],
    options: AddReceiptToInventoryOptions = {},
  ): Promise<ReceiptToInventoryResult> {
    this.logger.log(
      `🚀 Ajout de ${validatedItems.length} items à l'inventaire pour l'utilisateur ${userId}`,
    );
    this.logger.debug(
      `📋 Items reçus: ${JSON.stringify(
        validatedItems.map((i) => ({
          productId: i.productId,
          productName: i.productData?.name,
          quantity: i.quantity,
          categorySlug: i.productData?.categorySlug,
        })),
      )}`,
    );

    const { purchaseDate = new Date(), autoCreateProducts = true } = options;

    const result: ReceiptToInventoryResult = {
      addedItems: [],
      failedItems: [],
      budgetImpact: {
        totalAmount: 0,
        expenseCreated: false,
      },
      summary: {
        totalItemsProcessed: validatedItems.length,
        successfulItems: 0,
        failedItems: 0,
        totalAmountSpent: 0,
      },
    };

    // Transaction pour garantir la cohérence
    await this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;

      // Traiter chaque item
      for (const item of validatedItems) {
        try {
          this.logger.debug(
            `🔹 Traitement item: ${JSON.stringify({
              productId: item.productId,
              productName: item.productData?.name,
              quantity: item.quantity,
            })}`,
          );

          // 1. Récupérer ou créer le produit
          const product = await this.getOrCreateProduct(
            tx,
            item,
            autoCreateProducts,
          );
          this.logger.debug(
            `✅ Produit obtenu/créé: ${product.id} - ${product.name}`,
          );

          // 2. Calculer le prix pour cette ligne
          const itemTotalPrice =
            item.totalPrice ||
            (item.unitPrice ? item.unitPrice * item.quantity : 0);
          this.logger.debug(`💰 Prix calculé: ${itemTotalPrice}`);

          // 3. Créer l'élément d'inventaire
          this.logger.debug(
            `📦 Création InventoryItem pour userId=${userId}, productId=${product.id}`,
          );
          const inventoryItem = await tx.inventoryItem.create({
            data: {
              userId,
              productId: product.id,
              quantity: item.quantity,
              expiryDate: item.expiryDate,
              purchaseDate,
              purchasePrice: item.unitPrice,
              storageLocation: item.storageLocation,
              notes: item.notes,
            },
          });
          this.logger.log(`✅ InventoryItem créé: ${inventoryItem.id}`);

          // 4. Ajouter au résultat
          result.addedItems.push({
            id: inventoryItem.id,
            productName: product.name,
            quantity: item.quantity,
            totalPrice: itemTotalPrice,
          });

          totalAmount += itemTotalPrice;
          result.summary.successfulItems++;

          this.logger.debug(`Item ajouté: ${product.name} x${item.quantity}`);
        } catch (error) {
          this.logger.error(
            `❌ Erreur lors de l'ajout de l'item: ${error.message}`,
            error.stack,
          );

          result.failedItems.push({
            productName:
              item.productData?.name || item.productId || 'Produit inconnu',
            error: error.message,
          });
          result.summary.failedItems++;
        }
      }

      result.summary.totalAmountSpent = totalAmount;
      result.budgetImpact.totalAmount = totalAmount;

      // 5. Gérer l'impact sur le budget si montant > 0
      if (totalAmount > 0) {
        try {
          const budgetImpact = await this.handleBudgetImpact(
            userId,
            totalAmount,
            purchaseDate,
            tx,
          );
          result.budgetImpact = { ...result.budgetImpact, ...budgetImpact };
        } catch (error) {
          this.logger.warn(
            `Erreur lors de la gestion du budget: ${error.message}`,
          );
          // On ne fait pas échouer toute la transaction pour un problème de budget
        }
      }
    });

    this.logger.log(
      `Ticket traité: ${result.summary.successfulItems}/${result.summary.totalItemsProcessed} items ajoutés`,
    );

    return result;
  }

  /**
   * Récupère un produit existant ou en crée un nouveau
   */
  private async getOrCreateProduct(
    tx: any, // PrismaTransaction
    item: ValidatedReceiptItem,
    autoCreateProducts: boolean,
  ) {
    // Si un productId est fourni, on le récupère
    if (item.productId) {
      const existingProduct = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!existingProduct) {
        throw new NotFoundException(`Produit ${item.productId} non trouvé`);
      }

      return existingProduct;
    }

    // Sinon, on doit créer un nouveau produit
    if (!item.productData) {
      throw new BadRequestException(
        'Données du produit manquantes pour créer un nouveau produit',
      );
    }

    if (!autoCreateProducts) {
      throw new BadRequestException(
        'Création automatique de produits désactivée',
      );
    }

    // Vérifier si la catégorie existe
    const category = await tx.category.findUnique({
      where: { slug: item.productData.categorySlug },
    });

    if (!category) {
      throw new BadRequestException(
        `Catégorie ${item.productData.categorySlug} non trouvée`,
      );
    }

    // Créer le nouveau produit
    const newProduct = await tx.product.create({
      data: {
        name: item.productData.name,
        brand: item.productData.brand,
        barcode: item.productData.barcode,
        categoryId: category.id,
        imageUrl: item.productData.imageUrl,
        unitType: item.productData.unitType,
        // Pour un produit créé via ticket, on a des infos limitées
      },
    });

    this.logger.debug(`Nouveau produit créé: ${newProduct.name}`);
    return newProduct;
  }

  /**
   * Gère l'impact sur le budget
   */
  private async handleBudgetImpact(
    userId: string,
    totalAmount: number,
    purchaseDate: Date,
    tx: any,
  ) {
    // Récupérer le budget actif de l'utilisateur
    const activeBudget = await tx.budget.findFirst({
      where: {
        userId,
        isActive: true,
        periodStart: { lte: purchaseDate },
        periodEnd: { gte: purchaseDate },
      },
    });

    if (!activeBudget) {
      this.logger.debug('Aucun budget actif trouvé pour cet utilisateur');
      return {
        expenseCreated: false,
        warningMessage: 'Aucun budget actif pour cette période',
      };
    }

    // Créer la dépense
    const expense = await tx.expense.create({
      data: {
        userId,
        budgetId: activeBudget.id,
        amount: totalAmount,
        date: purchaseDate,
        source: 'Ticket de caisse', // Source générique, on pourrait ajouter le nom du magasin
        category: 'FOOD', // Catégorie par défaut pour les courses
      },
    });

    // Calculer le montant restant du budget
    const totalExpenses = await tx.expense.aggregate({
      where: {
        budgetId: activeBudget.id,
      },
      _sum: {
        amount: true,
      },
    });

    const remainingBudget =
      activeBudget.amount - (totalExpenses._sum.amount || 0);

    let warningMessage: string | undefined;
    if (remainingBudget < 0) {
      warningMessage = `Budget dépassé de ${Math.abs(remainingBudget).toFixed(2)}€`;
    } else if (remainingBudget < activeBudget.amount * 0.1) {
      warningMessage = `Attention: il ne reste que ${remainingBudget.toFixed(2)}€ sur votre budget`;
    }

    return {
      expenseCreated: true,
      budgetId: activeBudget.id,
      remainingBudget,
      warningMessage,
    };
  }

  /**
   * Valide les items avant ajout (optionnel, pour validation avancée)
   */
  async validateReceiptItems(
    items: ValidatedReceiptItem[],
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const [index, item] of items.entries()) {
      const itemLabel = `Item ${index + 1}`;

      // Validation quantité
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`${itemLabel}: La quantité doit être supérieure à 0`);
      }

      // Validation produit
      if (!item.productId && !item.productData) {
        errors.push(`${itemLabel}: ID produit ou données produit requises`);
      }

      // Validation données produit si nouveau
      if (item.productData) {
        if (!item.productData.name?.trim()) {
          errors.push(`${itemLabel}: Nom du produit requis`);
        }
        if (!item.productData.categorySlug?.trim()) {
          errors.push(`${itemLabel}: Catégorie requise`);
        }
      }

      // Validation date expiration
      if (item.expiryDate && item.expiryDate < new Date()) {
        errors.push(
          `${itemLabel}: La date d'expiration ne peut pas être dans le passé`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Récupère les statistiques d'ajout de tickets pour un utilisateur
   */
  async getReceiptStats(userId: string): Promise<{
    totalReceiptsProcessed: number;
    totalItemsAdded: number;
    totalAmountSpent: number;
    lastReceiptDate?: Date;
  }> {
    // Cette méthode nécessiterait un tracking des tickets dans la DB
    // Pour le moment, on peut retourner des stats basiques depuis les expenses

    const expenseStats = await this.prisma.expense.aggregate({
      where: {
        userId,
        source: 'Ticket de caisse',
      },
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    });

    const lastExpense = await this.prisma.expense.findFirst({
      where: {
        userId,
        source: 'Ticket de caisse',
      },
      orderBy: {
        date: 'desc',
      },
    });

    return {
      totalReceiptsProcessed: expenseStats._count.id,
      totalItemsAdded: 0, // Nécessiterait un tracking spécifique
      totalAmountSpent: expenseStats._sum.amount || 0,
      lastReceiptDate: lastExpense?.date,
    };
  }
}
