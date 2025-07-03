import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddManualProductDto, ProductCreatedResponseDto } from '../dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ajoute un produit manuellement à l'inventaire d'un utilisateur
   * @param userId ID de l'utilisateur connecté
   * @param addProductDto Données du formulaire d'ajout de produit
   * @returns L'élément d'inventaire créé avec les informations du produit
   */
  async addManualProduct(
    userId: string,
    addProductDto: AddManualProductDto,
  ): Promise<ProductCreatedResponseDto> {
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

      // 4. Retourner la réponse formatée
      return this.formatResponse(inventoryItem, product);
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
      barcode: product.barcode, // Inclure le code-barres dans la réponse
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