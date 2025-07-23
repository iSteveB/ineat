import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddManualProductDto, ProductCreatedResponseDto } from '../dto';
import { QuickAddProductDto } from 'src/DTOs';
import { BudgetService } from 'src/budget/services/budget.service';
import { ExpenseService } from 'src/budget/services/expense.service'; // ← Nouvelle injection

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

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly budgetService: BudgetService,
    private readonly expenseService: ExpenseService, // ← Nouvelle injection
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

      // 2. Vérifier si le produit existe déjà dans l'inventaire de l'utilisateur
      await this.checkDuplicateInventoryItem(
        tx,
        userId,
        product.id,
        addProductDto,
      );

      // 3. Créer l'élément d'inventaire
      const inventoryItem = await this.createInventoryItem(
        tx,
        userId,
        product.id,
        addProductDto,
      );

      // 4. Formater la réponse de base
      const baseResponse = this.formatResponse(inventoryItem, product);

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

      // 2. Vérifier s'il y a un doublon dans l'inventaire
      await this.checkDuplicateInventoryItemForQuickAdd(
        tx,
        userId,
        quickAddDto.productId,
        quickAddDto,
      );

      // 3. Créer l'élément d'inventaire
      const inventoryItem = await this.createInventoryItemFromQuickAdd(
        tx,
        userId,
        quickAddDto,
      );

      // 4. Formater la réponse de base
      const baseResponse = this.formatResponse(inventoryItem, product);

      // 5. Gérer l'impact budgétaire
      const budgetImpact = await this.handleBudgetImpact(
        userId,
        quickAddDto.purchasePrice,
        {
          productName: product.name,
          purchaseDate: quickAddDto.purchaseDate,
          inventoryItemId: inventoryItem.id,
          source: 'Ajout produit existant',
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
   * Gère l'impact budgétaire lors de l'ajout d'un produit
   * @param userId ID de l'utilisateur
   * @param purchasePrice Prix d'achat (peut être undefined)
   * @param productInfo Informations sur le produit pour créer la dépense
   * @returns Informations sur l'impact budgétaire
   */
  private async handleBudgetImpact(
    userId: string,
    purchasePrice: number | undefined,
    productInfo: {
      productName: string;
      purchaseDate: string;
      inventoryItemId: string;
      source: string;
      notes?: string;
    },
  ): Promise<{
    expenseCreated: boolean;
    message: string;
    budgetId?: string;
    remainingBudget?: number;
  }> {
    // Si pas de prix, pas d'impact budgétaire
    if (!purchasePrice || purchasePrice === 0) {
      return {
        expenseCreated: false,
        message:
          'Produit ajouté sans impact sur le budget (prix non renseigné)',
      };
    }

    try {
      // Créer la dépense via le service Expense
      const expenseResult = await this.expenseService.createExpenseFromProduct(
        userId,
        {
          productName: productInfo.productName,
          amount: purchasePrice,
          purchaseDate: productInfo.purchaseDate,
          source: productInfo.source,
          notes: productInfo.notes,
          inventoryItemId: productInfo.inventoryItemId,
        },
        {
          findOrCreateBudget: true,
          defaultBudgetAmount: 300, // Budget par défaut si aucun n'existe
          autoDetectCategory: true,
        },
      );

      if (expenseResult.expense && expenseResult.budgetId) {
        // Récupérer les statistiques du budget pour connaître le montant restant
        const budgetStats = await this.budgetService.getBudgetStats(
          expenseResult.budgetId,
          userId,
        );

        return {
          expenseCreated: true,
          message: `Dépense de ${purchasePrice.toFixed(2)}€ ajoutée au budget`,
          budgetId: expenseResult.budgetId,
          remainingBudget: budgetStats.remaining,
        };
      } else {
        return {
          expenseCreated: false,
          message: expenseResult.message,
        };
      }
    } catch (error) {
      // Si erreur lors de la création de la dépense, on log mais on continue
      console.error('Erreur lors de la création de la dépense:', error);
      return {
        expenseCreated: false,
        message: 'Produit ajouté mais erreur lors de la mise à jour du budget',
      };
    }
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
        category: true,
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
        product: {
          include: {
            category: true,
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
  ) {
    const where: any = {
      userId,
    };

    // Application des filtres
    if (filters) {
      if (filters.category) {
        where.product = {
          category: {
            slug: filters.category,
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

    return await this.prisma.inventoryItem.findMany({
      where,
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
      orderBy: [
        { expiryDate: 'asc' }, // Produits qui périment en premier
        { createdAt: 'desc' }, // Plus récents en premier pour ceux sans date
      ],
    });
  }

  /**
   * Calcule les statistiques complètes de l'inventaire d'un utilisateur
   * @param userId ID de l'utilisateur
   * @returns Statistiques détaillées conformes au schéma InventoryStats
   */
  async getInventoryStats(userId: string): Promise<InventoryStats> {
    // Récupérer tout l'inventaire avec les relations nécessaires
    const inventory = await this.prisma.inventoryItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    // Calculer les statistiques de base
    const totalItems = inventory.length;
    const totalValue = inventory.reduce((sum, item) => {
      return (
        sum + (item.purchasePrice ? item.purchasePrice * item.quantity : 0)
      );
    }, 0);
    const totalQuantity = inventory.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const averageItemValue = totalItems > 0 ? totalValue / totalItems : 0;

    // Calculer la répartition par statut d'expiration
    const expiryBreakdown = {
      good: 0,
      warning: 0,
      critical: 0,
      expired: 0,
      unknown: 0,
    };

    inventory.forEach((item) => {
      const status = this.calculateExpiryStatus(item.expiryDate);
      expiryBreakdown[status.toLowerCase() as keyof typeof expiryBreakdown]++;
    });

    // Calculer la répartition par catégorie
    const categoryMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        count: number;
        totalValue: number;
      }
    >();

    inventory.forEach((item) => {
      const categoryId = item.product.category.id;
      const categoryName = item.product.category.name;
      const itemValue = (item.purchasePrice || 0) * item.quantity;

      if (categoryMap.has(categoryId)) {
        const category = categoryMap.get(categoryId)!;
        category.count++;
        category.totalValue += itemValue;
      } else {
        categoryMap.set(categoryId, {
          categoryId,
          categoryName,
          count: 1,
          totalValue: itemValue,
        });
      }
    });

    const categoryBreakdown = Array.from(categoryMap.values()).map(
      (category) => ({
        ...category,
        percentage: totalItems > 0 ? (category.count / totalItems) * 100 : 0,
      }),
    );

    // Calculer la répartition par lieu de stockage
    const storageMap = new Map<string, number>();

    inventory.forEach((item) => {
      const location = item.storageLocation || 'Non spécifié';
      storageMap.set(location, (storageMap.get(location) || 0) + 1);
    });

    const storageBreakdown: Record<
      string,
      { count: number; percentage: number }
    > = {};
    storageMap.forEach((count, location) => {
      storageBreakdown[location] = {
        count,
        percentage: totalItems > 0 ? (count / totalItems) * 100 : 0,
      };
    });

    // Calculer l'activité récente
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const itemsAddedThisWeek = inventory.filter(
      (item) => new Date(item.createdAt) >= oneWeekAgo,
    ).length;

    // Pour itemsConsumedThisWeek, on aurait besoin d'un historique des consommations
    // Pour l'instant, on met 0 car ce n'est pas encore implémenté
    const itemsConsumedThisWeek = 0;

    const recentActivity = {
      itemsAddedThisWeek,
      itemsConsumedThisWeek,
      // averageDaysToConsumption serait calculé avec l'historique des consommations
    };

    return {
      totalItems,
      totalValue: Math.round(totalValue * 100) / 100, // Arrondi à 2 décimales
      totalQuantity,
      averageItemValue: Math.round(averageItemValue * 100) / 100,
      expiryBreakdown,
      categoryBreakdown,
      storageBreakdown,
      recentActivity,
    };
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
        | 'storageLocation'
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
    });

    if (!existingItem) {
      throw new NotFoundException("Élément d'inventaire non trouvé");
    }

    // Préparer les données de mise à jour
    const updatePayload: any = {};

    if (updateData.quantity !== undefined) {
      updatePayload.quantity = updateData.quantity;
    }

    if (updateData.expiryDate !== undefined) {
      updatePayload.expiryDate = updateData.expiryDate
        ? new Date(updateData.expiryDate)
        : null;
    }

    if (updateData.storageLocation !== undefined) {
      updatePayload.storageLocation = updateData.storageLocation;
    }

    if (updateData.notes !== undefined) {
      updatePayload.notes = updateData.notes;
    }

    if (updateData.purchasePrice !== undefined) {
      updatePayload.purchasePrice = updateData.purchasePrice;
    }

    return await this.prisma.inventoryItem.update({
      where: { id: inventoryItemId },
      data: updatePayload,
      include: {
        product: {
          include: {
            category: true,
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

  // --- MÉTHODES PRIVÉES POUR L'AJOUT RAPIDE ---

  /**
   * Valide les données métier pour l'ajout rapide
   */
  private async validateQuickAddData(
    quickAddDto: QuickAddProductDto,
  ): Promise<void> {
    // Vérifier la cohérence des dates
    if (quickAddDto.expiryDate && quickAddDto.purchaseDate) {
      const purchaseDate = new Date(quickAddDto.purchaseDate);
      const expiryDate = new Date(quickAddDto.expiryDate);

      if (expiryDate <= purchaseDate) {
        throw new BadRequestException(
          "La date de péremption doit être postérieure à la date d'achat",
        );
      }
    }

    // Vérifier que la date d'achat n'est pas dans le futur
    const purchaseDate = new Date(quickAddDto.purchaseDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Fin de journée pour permettre les achats du jour

    if (purchaseDate > today) {
      throw new BadRequestException(
        "La date d'achat ne peut pas être dans le futur",
      );
    }
  }

  /**
   * Recherche un produit par son ID et vérifie qu'il existe
   */
  private async findProductById(tx: any, productId: string) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Le produit avec l'ID ${productId} n'existe pas`,
      );
    }

    return product;
  }

  /**
   * Vérifie s'il y a un doublon dans l'inventaire pour l'ajout rapide
   */
  private async checkDuplicateInventoryItemForQuickAdd(
    tx: any,
    userId: string,
    productId: string,
    quickAddDto: QuickAddProductDto,
  ): Promise<void> {
    const existingInventoryItem = await tx.inventoryItem.findFirst({
      where: {
        userId,
        productId,
        storageLocation: quickAddDto.storageLocation || null,
        expiryDate: quickAddDto.expiryDate
          ? new Date(quickAddDto.expiryDate)
          : null,
      },
    });

    if (existingInventoryItem) {
      throw new ConflictException(
        'Ce produit existe déjà dans votre inventaire avec les mêmes caractéristiques (lieu de stockage et date de péremption). Vous pouvez modifier la quantité existante.',
      );
    }
  }

  /**
   * Crée l'élément d'inventaire à partir des données d'ajout rapide
   */
  private async createInventoryItemFromQuickAdd(
    tx: any,
    userId: string,
    quickAddDto: QuickAddProductDto,
  ) {
    return await tx.inventoryItem.create({
      data: {
        userId,
        productId: quickAddDto.productId,
        quantity: quickAddDto.quantity,
        purchaseDate: new Date(quickAddDto.purchaseDate),
        expiryDate: quickAddDto.expiryDate
          ? new Date(quickAddDto.expiryDate)
          : null,
        purchasePrice: quickAddDto.purchasePrice || null,
        storageLocation: quickAddDto.storageLocation || null,
        notes: quickAddDto.notes || null,
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  /**
   * Valide les données métier du produit
   */
  private async validateProductData(
    addProductDto: AddManualProductDto,
  ): Promise<void> {
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

    // Vérifier la cohérence des dates
    if (addProductDto.expiryDate && addProductDto.purchaseDate) {
      const purchaseDate = new Date(addProductDto.purchaseDate);
      const expiryDate = new Date(addProductDto.expiryDate);

      if (expiryDate <= purchaseDate) {
        throw new BadRequestException(
          "La date de péremption doit être postérieure à la date d'achat",
        );
      }
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
    const barcodeRegex = /^(\d{8}|\d{12,14})$/;
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
        include: { category: true },
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
          include: { category: true },
        });
      }

      return existingProduct;
    }

    // 4. Créer un nouveau produit
    const nutritionalData = addProductDto.nutritionalInfo
      ? {
          carbohydrates: addProductDto.nutritionalInfo.carbohydrates,
          proteins: addProductDto.nutritionalInfo.proteins,
          fats: addProductDto.nutritionalInfo.fats,
          salt: addProductDto.nutritionalInfo.salt,
        }
      : null;

    try {
      return await tx.product.create({
        data: {
          name: addProductDto.name,
          brand: addProductDto.brand,
          barcode: addProductDto.barcode, // Inclure le code-barres
          categoryId: category!.id,
          unitType: addProductDto.unitType,
          nutriscore: addProductDto.nutriscore,
          ecoScore: addProductDto.ecoscore,
          nutrients: nutritionalData,
        },
        include: { category: true },
      });
    } catch (error) {
      // Gestion des erreurs de contrainte unique sur le code-barres
      if (error.code === 'P2002' && error.meta?.target?.includes('barcode')) {
        throw new ConflictException(
          `Un produit avec le code-barres ${addProductDto.barcode} existe déjà`,
        );
      }
      throw error;
    }
  }

  /**
   * Vérifie s'il y a un doublon dans l'inventaire
   */
  private async checkDuplicateInventoryItem(
    tx: any, // Type générique pour la transaction Prisma
    userId: string,
    productId: string,
    addProductDto: AddManualProductDto,
  ): Promise<void> {
    const existingInventoryItem = await tx.inventoryItem.findFirst({
      where: {
        userId,
        productId,
        storageLocation: addProductDto.storageLocation || null,
        expiryDate: addProductDto.expiryDate
          ? new Date(addProductDto.expiryDate)
          : null,
      },
    });

    if (existingInventoryItem) {
      throw new ConflictException(
        'Ce produit existe déjà dans votre inventaire avec les mêmes caractéristiques. Vous pouvez modifier la quantité existante.',
      );
    }
  }

  /**
   * Crée l'élément d'inventaire
   */
  private async createInventoryItem(
    tx: any, // Type générique pour la transaction Prisma
    userId: string,
    productId: string,
    addProductDto: AddManualProductDto,
  ) {
    return await tx.inventoryItem.create({
      data: {
        userId,
        productId,
        quantity: addProductDto.quantity,
        purchaseDate: new Date(addProductDto.purchaseDate),
        expiryDate: addProductDto.expiryDate
          ? new Date(addProductDto.expiryDate)
          : null,
        purchasePrice: addProductDto.purchasePrice,
        storageLocation: addProductDto.storageLocation,
        notes: addProductDto.notes,
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  /**
   * Formate la réponse pour le client
   */
  private formatResponse(
    inventoryItem: any,
    product: any,
  ): ProductCreatedResponseDto {
    return {
      id: inventoryItem.id,
      name: product.name,
      brand: product.brand,
      barcode: product.barcode,
      category: inventoryItem.product.category.slug,
      quantity: inventoryItem.quantity,
      unitType: product.unitType,
      purchaseDate: inventoryItem.purchaseDate.toISOString(),
      expiryDate: inventoryItem.expiryDate?.toISOString(),
      purchasePrice: inventoryItem.purchasePrice,
      storageLocation: inventoryItem.storageLocation,
      notes: inventoryItem.notes,
      nutriscore: product.nutriscore,
      ecoscore: product.ecoScore,
      createdAt: inventoryItem.createdAt.toISOString(),
      updatedAt: inventoryItem.updatedAt.toISOString(),
    };
  }
}
