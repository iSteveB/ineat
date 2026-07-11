import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddManualProductDto, ProductCreatedResponseDto } from '../dto';
import { QuickAddProductDto } from '../../DTOs';
import { BudgetService } from '../../budget/services/budget.service';
import { ExpenseService } from '../../budget/services/expense.service';
import { randomUUID } from 'crypto';
import {
  estimateExpiryDate,
  ExpiryEstimationResult,
} from './expiry-estimation.service';

// Types pour les statistiques d'inventaire (conformes au schéma InventoryStats)
export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  totalQuantity: number;
  averageItemValue: number;
  expiryBreakdown: {
    good: number;
    warning: number;
    critical: number;
    expired: number;
    unknown: number;
  };
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    count: number;
    percentage: number;
    totalValue: number;
  }>;
  storageBreakdown: Record<
    string,
    {
      count: number;
      percentage: number;
    }
  >;
  recentActivity: {
    itemsAddedThisWeek: number;
    itemsConsumedThisWeek: number;
    averageDaysToConsumption?: number;
  };
}

// Interface pour les réponses avec impact budgétaire
export interface ProductCreatedWithBudgetDto extends ProductCreatedResponseDto {
  budgetImpact: {
    expenseCreated: boolean;
    message: string;
    budgetId?: string;
    remainingBudget?: number;
  };
}

type ExpiryStatus = 'GOOD' | 'WARNING' | 'CRITICAL' | 'EXPIRED' | 'UNKNOWN';

export interface InventoryPaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedInventoryResult {
  items: any[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

type InventoryItemInput = Pick<
  AddManualProductDto,
  | 'quantity'
  | 'purchaseDate'
  | 'purchasePrice'
  | 'storageLocation'
  | 'packageStatus'
  | 'preparationStatus'
  | 'notes'
>;

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly budgetService: BudgetService,
    private readonly expenseService: ExpenseService,
  ) {}

  /**
   * Ajoute un produit manuellement à l'inventaire d'un utilisateur
   * @param userId ID de l'utilisateur connecté
   * @param addProductDto Données du formulaire d'ajout de produit
   * @returns L'élément d'inventaire créé avec les informations du produit et l'impact budgétaire
   */
  async addManualProduct(
    userId: string,
    addProductDto: AddManualProductDto,
  ): Promise<ProductCreatedWithBudgetDto> {
    // Validation des données métier
    await this.validateProductData(addProductDto);

    // Utilisation d'une transaction pour assurer la cohérence des données
    return await this.prisma.$transaction(async (tx: any) => {
      // 1. Récupérer ou créer le produit
      const product = await this.findOrCreateProduct(tx, addProductDto);

      const expiryEstimation = estimateExpiryDate({
        productName: product.name ?? addProductDto.name,
        categorySlug: product.Category?.slug ?? addProductDto.category,
        categoryName: product.Category?.name,
        storageLocation: addProductDto.storageLocation,
        packageStatus: addProductDto.packageStatus,
        preparationStatus: addProductDto.preparationStatus,
        purchaseDate: addProductDto.purchaseDate,
        manualExpiryDate: addProductDto.expiryDate,
      });

      // 2. Créer un nouveau lot ou incrémenter un lot compatible
      const inventoryItem = await this.upsertInventoryLot(
        tx,
        userId,
        product.id,
        addProductDto,
        expiryEstimation,
      );

      // 4. Formater la réponse de base
      const baseResponse = this.formatResponse(
        inventoryItem,
        product,
        expiryEstimation,
      );

      // 5. Gérer l'impact budgétaire
      const budgetImpact = await this.handleBudgetImpact(
        userId,
        addProductDto.purchasePrice,
        {
          productName: addProductDto.name,
          purchaseDate: addProductDto.purchaseDate,
          inventoryItemId: inventoryItem.id,
          source: 'Ajout manuel',
          notes: addProductDto.notes,
        },
      );

      return {
        ...baseResponse,
        budgetImpact,
      };
    });
  }

  /**
   * Ajoute un produit existant à l'inventaire d'un utilisateur (ajout rapide)
   * @param userId ID de l'utilisateur connecté
   * @param quickAddDto Données d'ajout rapide du produit existant
   * @returns L'élément d'inventaire créé avec les informations du produit et l'impact budgétaire
   */
  async addExistingProductToInventory(
    userId: string,
    quickAddDto: QuickAddProductDto,
  ): Promise<ProductCreatedWithBudgetDto> {
    // Validation des données métier
    await this.validateQuickAddData(quickAddDto);

    // Utilisation d'une transaction pour assurer la cohérence
    return await this.prisma.$transaction(async (tx: any) => {
      // 1. Vérifier que le produit existe
      const product = await this.findProductById(tx, quickAddDto.productId);

      const expiryEstimation = estimateExpiryDate({
        productName: product.name,
        categorySlug: product.Category?.slug,
        categoryName: product.Category?.name,
        storageLocation: quickAddDto.storageLocation,
        packageStatus: quickAddDto.packageStatus,
        preparationStatus: quickAddDto.preparationStatus,
        purchaseDate: quickAddDto.purchaseDate,
        manualExpiryDate: quickAddDto.expiryDate,
      });

      // 2. Créer un nouveau lot ou incrémenter un lot compatible
      const inventoryItem = await this.upsertInventoryLot(
        tx,
        userId,
        quickAddDto.productId,
        quickAddDto,
        expiryEstimation,
      );

      // 4. Formater la réponse de base
      const baseResponse = this.formatResponse(
        inventoryItem,
        product,
        expiryEstimation,
      );

      // 5. Gérer l'impact budgétaire
      const budgetImpact = await this.handleBudgetImpact(
        userId,
        quickAddDto.purchasePrice,
        {
          productName: product.name,
          purchaseDate: quickAddDto.purchaseDate,
          inventoryItemId: inventoryItem.id,
          source: 'Ajout rapide',
          notes: quickAddDto.notes,
        },
      );

      return {
        ...baseResponse,
        budgetImpact,
      };
    });
  }

  /**
   * Recherche un produit par son code-barres
   * @param barcode Code-barres du produit
   * @returns Le produit trouvé ou null
   */
  async findProductByBarcode(barcode: string) {
    if (!barcode) {
      return null;
    }

    return await this.prisma.product.findUnique({
      where: { barcode },
      include: {
        Category: true,
      },
    });
  }

  /**
   * Récupère les produits récemment ajoutés à l'inventaire d'un utilisateur
   * @param userId ID de l'utilisateur
   * @param limit Nombre maximum de produits à retourner (défaut: 5)
   * @returns Liste des produits récents triés par date d'ajout décroissante
   */
  async getRecentProducts(userId: string, limit: number = 5) {
    return await this.prisma.inventoryItem.findMany({
      where: {
        userId,
      },
      include: {
        Product: {
          include: {
            Category: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' }, // Plus récents en premier
      ],
      take: limit, // Limiter le nombre de résultats
    });
  }

  /**
   * Récupère l'inventaire complet d'un utilisateur avec filtres optionnels
   * @param userId ID de l'utilisateur
   * @param filters Filtres optionnels (catégorie, lieu de stockage, etc.)
   * @returns Liste des éléments d'inventaire
   */
  async getUserInventory(
    userId: string,
    filters?: {
      category?: string;
      storageLocation?: string;
      expiringWithinDays?: number;
    },
    pagination?: InventoryPaginationOptions,
  ): Promise<any[] | PaginatedInventoryResult> {
    const where: any = {
      userId,
    };

    // Application des filtres
    if (filters) {
      if (filters.category) {
        where.Product = {
          Category: {
            OR: [{ id: filters.category }, { slug: filters.category }],
          },
        };
      }

      if (filters.storageLocation) {
        where.storageLocation = filters.storageLocation;
      }

      if (filters.expiringWithinDays) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + filters.expiringWithinDays);

        where.expiryDate = {
          lte: futureDate,
          gte: new Date(),
        };
      }
    }

    const page =
      pagination?.page && pagination.page > 0 ? Math.floor(pagination.page) : 1;
    const limit =
      pagination?.limit && pagination.limit > 0
        ? Math.min(Math.floor(pagination.limit), 100)
        : undefined;

    const query = {
      where,
      include: {
        Product: {
          include: {
            Category: true,
          },
        },
      },
      orderBy: [
        { expiryDate: 'asc' as const }, // Produits qui périment en premier
        { createdAt: 'desc' as const }, // Plus récents en premier pour ceux sans date
      ],
    };

    if (!limit) {
      const items = await this.prisma.inventoryItem.findMany(query);
      return this.groupInventoryItemsByProduct(items);
    }

    const items = await this.prisma.inventoryItem.findMany(query);
    const groupedItems = this.groupInventoryItemsByProduct(items);
    const totalItems = groupedItems.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedItems = groupedItems.slice((page - 1) * limit, page * limit);

    return {
      items: paginatedItems,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getInventoryItemById(userId: string, inventoryItemId: string) {
    return await this.prisma.inventoryItem.findFirst({
      where: {
        id: inventoryItemId,
        userId,
      },
      include: {
        Product: {
          include: {
            Category: true,
          },
        },
      },
    });
  }

  /**
   * Met à jour un élément d'inventaire
   * @param userId ID de l'utilisateur
   * @param inventoryItemId ID de l'élément d'inventaire
   * @param updateData Données à mettre à jour
   */
  async updateInventoryItem(
    userId: string,
    inventoryItemId: string,
    updateData: Partial<
      Pick<
        AddManualProductDto,
        | 'quantity'
        | 'expiryDate'
        | 'purchaseDate'
        | 'storageLocation'
        | 'packageStatus'
        | 'preparationStatus'
        | 'notes'
        | 'purchasePrice'
      >
    >,
  ) {
    // Vérifier que l'élément appartient à l'utilisateur
    const existingItem = await this.prisma.inventoryItem.findFirst({
      where: {
        id: inventoryItemId,
        userId,
      },
      include: {
        Product: {
          include: {
            Category: true,
          },
        },
      },
    });

    if (!existingItem) {
      throw new NotFoundException("Élément d'inventaire non trouvé");
    }
    const existingInventoryItem = existingItem as any;

    // Préparer les données de mise à jour
    const updatePayload: any = {};

    if (updateData.quantity !== undefined) {
      updatePayload.quantity = updateData.quantity;
    }

    if (updateData.expiryDate !== undefined) {
      updatePayload.expiryDate = updateData.expiryDate
        ? new Date(updateData.expiryDate)
        : null;
      updatePayload.expiryDateSource = 'MANUAL';
    }

    if (updateData.purchaseDate !== undefined) {
      updatePayload.purchaseDate = new Date(updateData.purchaseDate);
    }

    if (updateData.storageLocation !== undefined) {
      updatePayload.storageLocation = updateData.storageLocation;
    }

    if (updateData.packageStatus !== undefined) {
      updatePayload.packageStatus = updateData.packageStatus;
    }

    if (updateData.preparationStatus !== undefined) {
      updatePayload.preparationStatus = updateData.preparationStatus;
    }

    if (updateData.notes !== undefined) {
      updatePayload.notes = updateData.notes;
    }

    if (updateData.purchasePrice !== undefined) {
      updatePayload.purchasePrice = updateData.purchasePrice;
    }

    const contextChanged =
      updateData.storageLocation !== undefined ||
      updateData.packageStatus !== undefined ||
      updateData.preparationStatus !== undefined ||
      updateData.purchaseDate !== undefined;

    if (
      updateData.expiryDate === undefined &&
      existingInventoryItem.expiryDateSource === 'ESTIMATED' &&
      contextChanged
    ) {
      const expiryEstimation = estimateExpiryDate({
        productName: existingInventoryItem.Product.name,
        categorySlug: existingInventoryItem.Product.Category?.slug,
        categoryName: existingInventoryItem.Product.Category?.name,
        storageLocation:
          updatePayload.storageLocation ??
          existingInventoryItem.storageLocation,
        packageStatus:
          updatePayload.packageStatus ?? existingInventoryItem.packageStatus,
        preparationStatus:
          updatePayload.preparationStatus ??
          existingInventoryItem.preparationStatus,
        purchaseDate:
          updatePayload.purchaseDate ?? existingInventoryItem.purchaseDate,
        addedAt: existingInventoryItem.createdAt,
      });

      updatePayload.expiryDate = expiryEstimation.expiryDate;
      updatePayload.expiryDateSource = expiryEstimation.source;
    }

    return await this.prisma.inventoryItem.update({
      where: { id: inventoryItemId },
      data: updatePayload,
      include: {
        Product: {
          include: {
            Category: true,
          },
        },
      },
    });
  }

  /**
   * Supprime un élément d'inventaire
   * @param userId ID de l'utilisateur
   * @param inventoryItemId ID de l'élément à supprimer
   */
  async removeInventoryItem(userId: string, inventoryItemId: string) {
    const existingItem = await this.prisma.inventoryItem.findFirst({
      where: {
        id: inventoryItemId,
        userId,
      },
    });

    if (!existingItem) {
      throw new NotFoundException("Élément d'inventaire non trouvé");
    }

    await this.prisma.inventoryItem.delete({
      where: { id: inventoryItemId },
    });

    return { success: true, message: "Produit supprimé de l'inventaire" };
  }

  async consumeInventoryItem(
    userId: string,
    inventoryItemId: string,
    quantityConsumed: number,
  ) {
    this.validatePositiveQuantity(quantityConsumed);

    return await this.prisma.$transaction(async (tx: any) => {
      const selectedItem = await tx.inventoryItem.findFirst({
        where: {
          id: inventoryItemId,
          userId,
        },
      });

      if (!selectedItem) {
        throw new NotFoundException("Élément d'inventaire non trouvé");
      }

      const lots = await tx.inventoryItem.findMany({
        where: {
          userId,
          productId: selectedItem.productId,
        },
        orderBy: [{ createdAt: 'asc' }],
      });
      const sortedLots = [...lots].sort((first, second) => {
        const expiryComparison = this.compareNullableDates(
          first.expiryDate,
          second.expiryDate,
        );

        if (expiryComparison !== 0) {
          return expiryComparison;
        }

        return (
          new Date(first.createdAt).getTime() -
          new Date(second.createdAt).getTime()
        );
      });
      const availableQuantity = sortedLots.reduce(
        (total, lot) => total + lot.quantity,
        0,
      );

      if (quantityConsumed > availableQuantity) {
        throw new BadRequestException(
          `Quantité insuffisante dans l'inventaire (${availableQuantity} disponible)`,
        );
      }

      let remainingToConsume = quantityConsumed;
      const consumedLots: Array<{
        id: string;
        quantityConsumed: number;
        remainingQuantity: number;
        deleted: boolean;
      }> = [];

      for (const lot of sortedLots) {
        if (remainingToConsume <= 0) {
          break;
        }

        const consumedFromLot = Math.min(lot.quantity, remainingToConsume);
        const remainingQuantity = lot.quantity - consumedFromLot;

        if (remainingQuantity <= 0) {
          await tx.inventoryItem.delete({
            where: { id: lot.id },
          });
        } else {
          await tx.inventoryItem.update({
            where: { id: lot.id },
            data: {
              quantity: remainingQuantity,
              updatedAt: new Date(),
            },
          });
        }

        consumedLots.push({
          id: lot.id,
          quantityConsumed: consumedFromLot,
          remainingQuantity,
          deleted: remainingQuantity <= 0,
        });
        remainingToConsume -= consumedFromLot;
      }

      return {
        success: true,
        productId: selectedItem.productId,
        quantityConsumed,
        remainingQuantity: availableQuantity - quantityConsumed,
        consumedLots,
      };
    });
  }

  /**
   * Supprime plusieurs éléments d'inventaire appartenant à l'utilisateur
   * @param userId ID de l'utilisateur
   * @param inventoryItemIds IDs des éléments à supprimer
   */
  async removeInventoryItems(userId: string, inventoryItemIds: string[]) {
    const uniqueIds = [...new Set(inventoryItemIds)];

    if (uniqueIds.length === 0) {
      throw new BadRequestException('Aucun produit sélectionné');
    }

    const result = await this.prisma.inventoryItem.deleteMany({
      where: {
        id: { in: uniqueIds },
        userId,
      },
    });

    return {
      success: true,
      deletedCount: result.count,
      message:
        result.count > 1
          ? `${result.count} produits supprimés de l'inventaire`
          : `${result.count} produit supprimé de l'inventaire`,
    };
  }

  // --- MÉTHODES PRIVÉES ---

  /**
   * Calcule le statut d'expiration d'un produit (conforme à la logique dans base.ts)
   * @param expiryDate Date de péremption (peut être null)
   * @returns Statut d'expiration
   */
  private calculateExpiryStatus(
    expiryDate?: Date | string | null,
  ): ExpiryStatus {
    if (!expiryDate) return 'UNKNOWN';

    const expiry =
      typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
    const today = new Date();
    const diffInMs = expiry.getTime() - today.getTime();
    const daysRemaining = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) return 'EXPIRED';
    if (daysRemaining <= 2) return 'CRITICAL';
    if (daysRemaining <= 5) return 'WARNING';
    return 'GOOD';
  }

  /**
   * Valide les données métier du produit
   */
  private async validateProductData(
    addProductDto: AddManualProductDto,
  ): Promise<void> {
    this.validateInventoryDates(
      addProductDto.purchaseDate,
      addProductDto.expiryDate,
    );
    this.validatePositiveQuantity(addProductDto.quantity);
    this.validatePurchasePrice(addProductDto.purchasePrice);

    // Vérifier que la catégorie existe
    const category = await this.prisma.category.findFirst({
      where: { slug: addProductDto.category },
    });

    if (!category) {
      throw new BadRequestException(
        `La catégorie "${addProductDto.category}" n'existe pas`,
      );
    }

    // Validation du format du code-barres si fourni
    if (addProductDto.barcode) {
      if (!this.isValidBarcodeFormat(addProductDto.barcode)) {
        throw new BadRequestException(
          `Format de code-barres invalide: ${addProductDto.barcode}`,
        );
      }
    }

    // Validation de l'URL d'image si fournie
    if (addProductDto.imageUrl) {
      try {
        new URL(addProductDto.imageUrl);
      } catch {
        throw new BadRequestException(
          `URL d'image invalide: ${addProductDto.imageUrl}`,
        );
      }
    }
  }

  private validateInventoryDates(
    purchaseDateInput: string,
    expiryDateInput?: string,
  ): void {
    const purchaseDate = new Date(purchaseDateInput);

    if (Number.isNaN(purchaseDate.getTime())) {
      throw new BadRequestException("La date d'achat doit être valide");
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (purchaseDate > today) {
      throw new BadRequestException(
        "La date d'achat ne peut pas être dans le futur",
      );
    }

    if (!expiryDateInput) {
      return;
    }

    const expiryDate = new Date(expiryDateInput);

    if (Number.isNaN(expiryDate.getTime())) {
      throw new BadRequestException('La date de péremption doit être valide');
    }

    if (expiryDate <= purchaseDate) {
      throw new BadRequestException(
        "La date de péremption doit être postérieure à la date d'achat",
      );
    }
  }

  private validatePositiveQuantity(quantity: number): void {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('La quantité doit être supérieure à 0');
    }
  }

  private validatePurchasePrice(purchasePrice?: number): void {
    if (purchasePrice === undefined || purchasePrice === null) {
      return;
    }

    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
      throw new BadRequestException("Le prix d'achat ne peut pas être négatif");
    }
  }

  /**
   * Valide le format du code-barres
   * @param barcode Code-barres à valider
   * @returns true si le format est valide
   */
  private isValidBarcodeFormat(barcode: string): boolean {
    // Validation basique pour codes-barres courants
    // EAN-8 (8 chiffres), EAN-13 (13 chiffres), UPC-A (12 chiffres), etc.
    const barcodeRegex = /^\d{8,13}$/;
    return barcodeRegex.test(barcode.trim());
  }

  /**
   * Trouve un produit existant ou en crée un nouveau
   */
  private async findOrCreateProduct(
    tx: any, // Type générique pour la transaction Prisma
    addProductDto: AddManualProductDto,
  ) {
    // 1. Si un code-barres est fourni, chercher d'abord par code-barres
    if (addProductDto.barcode) {
      const existingProductByBarcode = await tx.product.findUnique({
        where: { barcode: addProductDto.barcode },
        include: { Category: true },
      });

      if (existingProductByBarcode) {
        // Le produit existe déjà avec ce code-barres
        return existingProductByBarcode;
      }
    }

    // 2. Récupérer la catégorie pour la recherche/création
    const category = await tx.category.findFirst({
      where: { slug: addProductDto.category },
    });

    // 3. Chercher un produit existant avec le même nom, marque et catégorie
    // (seulement si pas de code-barres ou si le code-barres n'a rien donné)
    const existingProduct = await tx.product.findFirst({
      where: {
        name: {
          equals: addProductDto.name,
          mode: 'insensitive', // Recherche insensible à la casse
        },
        brand: addProductDto.brand || null,
        categoryId: category!.id,
        // Si un code-barres est fourni, on ne veut pas matcher un produit
        // qui aurait un code-barres différent ou null
        ...(addProductDto.barcode
          ? { barcode: null } // Chercher seulement parmi les produits sans code-barres
          : {}),
      },
    });

    if (existingProduct) {
      // Si on a trouvé un produit similaire ET qu'on a un code-barres à ajouter
      if (addProductDto.barcode && !existingProduct.barcode) {
        // Mettre à jour le produit existant avec le code-barres
        return await tx.product.update({
          where: { id: existingProduct.id },
          data: { barcode: addProductDto.barcode },
          include: { Category: true },
        });
      }

      return existingProduct;
    }

    // Créer un nouveau produit avec tous les nouveaux champs
    const nutritionalData = addProductDto.nutrients
      ? {
          energy: addProductDto.nutrients.energy,
          carbohydrates: addProductDto.nutrients.carbohydrates,
          sugars: addProductDto.nutrients.sugars,
          proteins: addProductDto.nutrients.proteins,
          fats: addProductDto.nutrients.fats,
          saturatedFats: addProductDto.nutrients.saturatedFats,
          fiber: addProductDto.nutrients.fiber,
          salt: addProductDto.nutrients.salt,
        }
      : null;

    try {
      return await tx.product.create({
        data: {
          id: randomUUID(),
          name: addProductDto.name,
          brand: addProductDto.brand,
          barcode: addProductDto.barcode,
          categoryId: category!.id,
          unitType: addProductDto.unitType,
          nutriscore: addProductDto.nutriscore,
          ecoscore: addProductDto.ecoscore,
          novascore: addProductDto.novascore,
          ingredients: addProductDto.ingredients,
          imageUrl: addProductDto.imageUrl,
          nutrients: nutritionalData,
          updatedAt: new Date(),
        },
        include: { Category: true },
      });
    } catch (error: any) {
      // Gestion des erreurs de contrainte unique sur le code-barres
      if (error.code === 'P2002' && error.meta?.target?.includes('barcode')) {
        throw new ConflictException(
          `Un produit avec le code-barres ${addProductDto.barcode} existe déjà`,
        );
      }
      throw error;
    }
  }

  private async upsertInventoryLot(
    tx: any,
    userId: string,
    productId: string,
    itemData: InventoryItemInput,
    expiryEstimation: ExpiryEstimationResult,
  ) {
    const matchingLot = await tx.inventoryItem.findFirst({
      where: {
        userId,
        productId,
        storageLocation: itemData.storageLocation || null,
        packageStatus: itemData.packageStatus || null,
        preparationStatus: itemData.preparationStatus || null,
        expiryDate: expiryEstimation.expiryDate,
      },
      include: {
        Product: {
          include: {
            Category: true,
          },
        },
      },
    });

    if (matchingLot) {
      const nextPurchasePrice =
        matchingLot.purchasePrice !== null && matchingLot.purchasePrice !== undefined
          ? matchingLot.purchasePrice + (itemData.purchasePrice ?? 0)
          : itemData.purchasePrice ?? null;

      return await tx.inventoryItem.update({
        where: { id: matchingLot.id },
        data: {
          quantity: matchingLot.quantity + itemData.quantity,
          purchaseDate: new Date(itemData.purchaseDate),
          purchasePrice: nextPurchasePrice,
          notes: itemData.notes ?? matchingLot.notes,
          updatedAt: new Date(),
        },
        include: {
          Product: {
            include: {
              Category: true,
            },
          },
        },
      });
    }

    return await tx.inventoryItem.create({
      data: {
        id: randomUUID(),
        userId,
        productId,
        quantity: itemData.quantity,
        purchaseDate: new Date(itemData.purchaseDate),
        expiryDate: expiryEstimation.expiryDate,
        expiryDateSource: expiryEstimation.source,
        packageStatus: itemData.packageStatus || null,
        preparationStatus: itemData.preparationStatus || null,
        purchasePrice: itemData.purchasePrice ?? null,
        storageLocation: itemData.storageLocation || null,
        notes: itemData.notes || null,
        updatedAt: new Date(),
      },
      include: {
        Product: {
          include: {
            Category: true,
          },
        },
      },
    });
  }

  private groupInventoryItemsByProduct(items: any[]): any[] {
    const groupedItems = new Map<string, any>();

    for (const item of items) {
      const existingItem = groupedItems.get(item.productId);
      const lot = this.formatInventoryLot(item);

      if (!existingItem) {
        groupedItems.set(item.productId, {
          ...item,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice ?? 0,
          lots: [lot],
        });
        continue;
      }

      existingItem.quantity += item.quantity;
      existingItem.purchasePrice =
        (existingItem.purchasePrice ?? 0) + (item.purchasePrice ?? 0);
      existingItem.lots.push(lot);

      if (this.shouldUseLotAsPrimaryItem(item, existingItem)) {
        groupedItems.set(item.productId, {
          ...item,
          quantity: existingItem.quantity,
          purchasePrice: existingItem.purchasePrice,
          lots: existingItem.lots,
        });
      }
    }

    return [...groupedItems.values()].map((item) => ({
      ...item,
      lots: item.lots.sort((first: any, second: any) =>
        this.compareNullableDates(first.expiryDate, second.expiryDate),
      ),
    }));
  }

  private formatInventoryLot(item: any) {
    return {
      id: item.id,
      quantity: item.quantity,
      expiryDate: item.expiryDate,
      expiryDateSource: item.expiryDateSource,
      purchaseDate: item.purchaseDate,
      purchasePrice: item.purchasePrice,
      storageLocation: item.storageLocation,
      packageStatus: item.packageStatus,
      preparationStatus: item.preparationStatus,
      notes: item.notes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private shouldUseLotAsPrimaryItem(candidate: any, current: any): boolean {
    return this.compareNullableDates(candidate.expiryDate, current.expiryDate) < 0;
  }

  private compareNullableDates(
    firstDate?: Date | string | null,
    secondDate?: Date | string | null,
  ): number {
    if (!firstDate && !secondDate) return 0;
    if (!firstDate) return 1;
    if (!secondDate) return -1;

    return new Date(firstDate).getTime() - new Date(secondDate).getTime();
  }

  /**
   * ✅ ENRICHI : Formate la réponse pour le client avec tous les nouveaux champs
   */
  private formatResponse(
    inventoryItem: any,
    product: any,
    expiryEstimation?: ExpiryEstimationResult,
  ): ProductCreatedResponseDto {
    return {
      id: inventoryItem.id,
      name: product.name,
      brand: product.brand,
      barcode: product.barcode,
      category: inventoryItem.Product.Category.slug,
      quantity: inventoryItem.quantity,
      unitType: product.unitType,
      purchaseDate: inventoryItem.purchaseDate.toISOString(),
      expiryDate: inventoryItem.expiryDate?.toISOString(),
      expiryDateSource: inventoryItem.expiryDateSource,
      expiryDateReason: expiryEstimation?.reason,
      expiryDateRuleId: expiryEstimation?.ruleId,
      expiryDateRuleLevel: expiryEstimation?.ruleLevel,
      expiryDateDurationDays: expiryEstimation?.durationDays,
      purchasePrice: inventoryItem.purchasePrice,
      storageLocation: inventoryItem.storageLocation,
      packageStatus: inventoryItem.packageStatus,
      preparationStatus: inventoryItem.preparationStatus,
      notes: inventoryItem.notes,
      nutriscore: product.nutriscore,
      ecoscore: product.ecoscore,
      novascore: product.novascore,
      ingredients: product.ingredients,
      imageUrl: product.imageUrl,
      nutrients: product.nutrients
        ? {
            energy: product.nutrients.energy,
            carbohydrates: product.nutrients.carbohydrates,
            sugars: product.nutrients.sugars,
            proteins: product.nutrients.proteins,
            fats: product.nutrients.fats,
            saturatedFats: product.nutrients.saturatedFats,
            fiber: product.nutrients.fiber,
            salt: product.nutrients.salt,
          }
        : undefined,
      createdAt: inventoryItem.createdAt.toISOString(),
      updatedAt: inventoryItem.updatedAt.toISOString(),
    };
  }

  /**
   * Gère l'impact budgétaire de l'ajout d'un produit
   */
  private async handleBudgetImpact(
    userId: string,
    purchasePrice?: number,
    expenseData?: {
      productName: string;
      purchaseDate: string;
      inventoryItemId: string;
      source: string;
      notes?: string;
    },
  ) {
    if (!purchasePrice || purchasePrice <= 0) {
      return {
        expenseCreated: false,
        message: 'Aucun impact budgétaire (prix non spécifié)',
      };
    }

    try {
      const expenseResult = await this.expenseService.createExpenseFromProduct(
        userId,
        {
          productName: expenseData?.productName || 'Produit',
          amount: purchasePrice,
          purchaseDate:
            expenseData?.purchaseDate || new Date().toISOString().split('T')[0],
          source: expenseData?.source || 'Inventaire',
          notes: expenseData?.notes,
          inventoryItemId: expenseData?.inventoryItemId,
        },
        {
          findOrCreateBudget: false,
          autoDetectCategory: true,
        },
      );

      if (!expenseResult.expense || !expenseResult.budgetId) {
        return {
          expenseCreated: false,
          message: expenseResult.message,
        };
      }

      const stats = await this.budgetService.getBudgetStats(
        expenseResult.budgetId,
        userId,
      );

      return {
        expenseCreated: true,
        message: expenseResult.message,
        budgetId: expenseResult.budgetId,
        remainingBudget: stats.remaining,
      };
    } catch (error) {
      console.error('Erreur lors de la gestion budgétaire:', error);
      return {
        expenseCreated: false,
        message: "Erreur lors de l'ajout de la dépense",
      };
    }
  }

  // ===== MÉTHODES POUR L'AJOUT RAPIDE (QuickAdd) =====

  /**
   * Valide les données d'ajout rapide
   */
  private async validateQuickAddData(
    quickAddDto: QuickAddProductDto,
  ): Promise<void> {
    this.validateInventoryDates(
      quickAddDto.purchaseDate,
      quickAddDto.expiryDate,
    );
    this.validatePositiveQuantity(quickAddDto.quantity);
    this.validatePurchasePrice(quickAddDto.purchasePrice);
  }

  /**
   * Trouve un produit par son ID
   */
  private async findProductById(tx: any, productId: string) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: { Category: true },
    });

    if (!product) {
      throw new NotFoundException(`Produit avec l'ID ${productId} introuvable`);
    }

    return product;
  }

  // ===== AUTRES MÉTHODES EXISTANTES (non modifiées) =====

  /**
   * Récupère les statistiques d'inventaire pour un utilisateur
   */
  async getInventoryStats(userId: string): Promise<InventoryStats> {
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [
      totalItems,
      valueStats,
      inventoryItems,
      storageStats,
      itemsAddedThisWeek,
    ] = await Promise.all([
      this.prisma.inventoryItem.count({ where: { userId } }),
      this.prisma.inventoryItem.aggregate({
        where: { userId },
        _sum: {
          purchasePrice: true,
          quantity: true,
        },
        _avg: {
          purchasePrice: true,
        },
      }),
      this.prisma.inventoryItem.findMany({
        where: { userId },
        include: {
          Product: {
            include: {
              Category: true,
            },
          },
        },
      }),
      this.prisma.inventoryItem.groupBy({
        by: ['storageLocation'],
        where: { userId },
        _count: { _all: true },
      }),
      this.prisma.inventoryItem.count({
        where: { userId, createdAt: { gte: oneWeekAgo } },
      }),
    ]);

    const expiryBreakdown = inventoryItems.reduce(
      (breakdown, item) => {
        const expiryDate =
          item.expiryDate ??
          estimateExpiryDate({
            productName: item.Product?.name,
            categorySlug: item.Product?.Category?.slug,
            categoryName: item.Product?.Category?.name,
            storageLocation: item.storageLocation,
            packageStatus: item.packageStatus,
            preparationStatus: item.preparationStatus,
            purchaseDate: item.purchaseDate,
            addedAt: item.createdAt,
          }).expiryDate;
        const status = this.calculateExpiryStatus(expiryDate).toLowerCase() as
          | 'good'
          | 'warning'
          | 'critical'
          | 'expired'
          | 'unknown';

        breakdown[status] += item.quantity || 0;
        return breakdown;
      },
      { good: 0, warning: 0, critical: 0, expired: 0, unknown: 0 },
    );

    const storageBreakdown = Object.fromEntries(
      storageStats.map((stat) => {
        const key = stat.storageLocation || 'unknown';
        const count = stat._count._all;

        return [
          key,
          {
            count,
            percentage:
              totalItems > 0 ? Math.round((count / totalItems) * 100) : 0,
          },
        ];
      }),
    );

    return {
      totalItems,
      totalValue: valueStats._sum.purchasePrice || 0,
      totalQuantity: valueStats._sum.quantity || 0,
      averageItemValue: valueStats._avg.purchasePrice || 0,
      expiryBreakdown: {
        good: expiryBreakdown.good,
        warning: expiryBreakdown.warning,
        critical: expiryBreakdown.critical,
        expired: expiryBreakdown.expired,
        unknown: expiryBreakdown.unknown,
      },
      categoryBreakdown: [],
      storageBreakdown,
      recentActivity: {
        itemsAddedThisWeek,
        itemsConsumedThisWeek: 0,
      },
    };
  }
}
