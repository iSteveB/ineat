import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import {
  InventoryService,
  ProductCreatedWithBudgetDto,
} from '../services/inventory.service';
import { AddManualProductDto, QuickAddProductDto } from '../../DTOs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    // autres propriétés selon votre modèle User
  };
}

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * Ajoute un produit manuellement à l'inventaire de l'utilisateur
   */
  @Post('products')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Ajouter un produit manuellement',
    description:
      "Permet à un utilisateur d'ajouter un produit à son inventaire en saisissant manuellement les informations. Si un prix est fourni, une dépense sera automatiquement créée et déduira du budget mensuel.",
  })
  @ApiBody({
    type: AddManualProductDto,
    description: "Informations du produit à ajouter à l'inventaire",
  })
  @ApiResponse({
    status: 201,
    description: "Produit ajouté avec succès à l'inventaire",
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            item: {
              $ref: '#/components/schemas/ProductCreatedResponseDto',
            },
            budget: {
              type: 'object',
              properties: {
                expenseCreated: {
                  type: 'boolean',
                  example: true,
                  description: 'Indique si une dépense a été créée',
                },
                message: {
                  type: 'string',
                  example: 'Dépense de 3.50€ ajoutée au budget',
                  description: "Message décrivant l'impact budgétaire",
                },
                budgetId: {
                  type: 'string',
                  format: 'uuid',
                  description: 'ID du budget impacté (si applicable)',
                },
                remainingBudget: {
                  type: 'number',
                  example: 146.5,
                  description: 'Montant restant dans le budget (si applicable)',
                },
              },
            },
          },
        },
        message: {
          type: 'string',
          example: 'Produit ajouté et 3.50€ déduit du budget',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Données invalides (validation échouée, dates incohérentes, format de code-barres invalide, etc.)',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Le nom du produit est obligatoire',
          'La quantité doit être supérieure à 0',
          'Format de code-barres invalide: 123',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Catégorie non trouvée',
    schema: {
      example: {
        statusCode: 404,
        message: 'La catégorie "categorie-inexistante" n\'existe pas',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description:
      "Produit déjà présent dans l'inventaire avec les mêmes caractéristiques ou code-barres déjà utilisé",
    schema: {
      example: {
        statusCode: 409,
        message: 'Un produit avec le code-barres 3263859672014 existe déjà',
        error: 'Conflict',
      },
    },
  })
  async addManualProduct(
    @Req() req: AuthenticatedRequest,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    addProductDto: AddManualProductDto,
  ) {
    const result: ProductCreatedWithBudgetDto =
      await this.inventoryService.addManualProduct(req.user.id, addProductDto);

    // Construire le message principal basé sur l'impact budgétaire
    let mainMessage = "Produit ajouté à l'inventaire";
    if (result.budgetImpact.expenseCreated && addProductDto.purchasePrice) {
      mainMessage = `Produit ajouté et ${addProductDto.purchasePrice.toFixed(2)}€ déduit du budget`;
    }

    return {
      success: true,
      data: {
        item: {
          id: result.id,
          name: result.name,
          brand: result.brand,
          barcode: result.barcode,
          category: result.category,
          quantity: result.quantity,
          unitType: result.unitType,
          purchaseDate: result.purchaseDate,
          expiryDate: result.expiryDate,
          purchasePrice: result.purchasePrice,
          storageLocation: result.storageLocation,
          notes: result.notes,
          nutriscore: result.nutriscore,
          ecoscore: result.ecoscore,
          novascore: result.novascore,
          ingredients: result.ingredients,
          imageUrl: result.imageUrl,
          nutrients: result.nutrients,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        },
        budget: result.budgetImpact,
      },
      message: mainMessage,
    };
  }

  /**
   * Ajoute rapidement un produit existant à l'inventaire
   */
  @Post('products/quick-add')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Ajouter rapidement un produit existant',
    description:
      "Permet d'ajouter rapidement un produit déjà présent dans la base de données à l'inventaire de l'utilisateur. Si un prix est fourni, une dépense sera automatiquement créée et déduira du budget mensuel.",
  })
  @ApiBody({
    type: QuickAddProductDto,
    description: "Informations pour ajouter le produit existant à l'inventaire",
  })
  @ApiResponse({
    status: 201,
    description: "Produit ajouté avec succès à l'inventaire",
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            item: {
              $ref: '#/components/schemas/ProductCreatedResponseDto',
            },
            budget: {
              type: 'object',
              properties: {
                expenseCreated: { type: 'boolean', example: true },
                message: {
                  type: 'string',
                  example: 'Dépense de 2.99€ ajoutée au budget',
                },
                budgetId: { type: 'string', format: 'uuid' },
                remainingBudget: { type: 'number', example: 147.01 },
              },
            },
          },
        },
        message: {
          type: 'string',
          example: 'Produit ajouté et 2.99€ déduit du budget',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Données invalides (validation échouée, dates incohérentes, etc.)',
    schema: {
      example: {
        statusCode: 400,
        message: [
          "L'ID du produit est obligatoire",
          'La quantité doit être supérieure à 0',
          "La date de péremption doit être postérieure à la date d'achat",
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Produit non trouvé',
    schema: {
      example: {
        statusCode: 404,
        message:
          "Le produit avec l'ID f47ac10b-58cc-4372-a567-0e02b2c3d479 n'existe pas",
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description:
      "Produit déjà présent dans l'inventaire avec les mêmes caractéristiques",
    schema: {
      example: {
        statusCode: 409,
        message:
          'Ce produit existe déjà dans votre inventaire avec les mêmes caractéristiques (lieu de stockage et date de péremption). Vous pouvez modifier la quantité existante.',
        error: 'Conflict',
      },
    },
  })
  async addExistingProductToInventory(
    @Req() req: AuthenticatedRequest,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    quickAddDto: QuickAddProductDto,
  ) {
    const result: ProductCreatedWithBudgetDto =
      await this.inventoryService.addExistingProductToInventory(
        req.user.id,
        quickAddDto,
      );

    // Construire le message principal basé sur l'impact budgétaire
    let mainMessage = "Produit ajouté à l'inventaire";
    if (result.budgetImpact.expenseCreated && quickAddDto.purchasePrice) {
      mainMessage = `Produit ajouté et ${quickAddDto.purchasePrice.toFixed(2)}€ déduit du budget`;
    }

    return {
      success: true,
      data: {
        item: {
          id: result.id,
          name: result.name,
          brand: result.brand,
          barcode: result.barcode,
          category: result.category,
          quantity: result.quantity,
          unitType: result.unitType,
          purchaseDate: result.purchaseDate,
          expiryDate: result.expiryDate,
          purchasePrice: result.purchasePrice,
          storageLocation: result.storageLocation,
          notes: result.notes,
          nutriscore: result.nutriscore,
          ecoscore: result.ecoscore,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        },
        budget: result.budgetImpact,
      },
      message: mainMessage,
    };
  }

  /**
   * Vérifie l'existence d'un produit par son code-barres
   */
  @Get('barcode/:barcode')
  @ApiOperation({
    summary: 'Vérifier un code-barres',
    description:
      'Vérifie si un produit avec ce code-barres existe déjà dans la base de données',
  })
  @ApiParam({
    name: 'barcode',
    description: 'Code-barres du produit à vérifier',
    type: 'string',
    example: '3263859672014',
  })
  @ApiResponse({
    status: 200,
    description: 'Vérification effectuée avec succès',
    schema: {
      type: 'object',
      properties: {
        exists: {
          type: 'boolean',
          description: 'Indique si le produit existe',
        },
        product: {
          type: 'object',
          nullable: true,
          description: 'Informations du produit si il existe',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            brand: { type: 'string', nullable: true },
            barcode: { type: 'string' },
            nutriscore: {
              type: 'string',
              enum: ['A', 'B', 'C', 'D', 'E'],
              nullable: true,
            },
            ecoscore: {
              type: 'string',
              enum: ['A', 'B', 'C', 'D', 'E'],
              nullable: true,
            },
            unitType: {
              type: 'string',
              enum: ['KG', 'G', 'L', 'ML', 'UNIT'],
            },
            imageUrl: { type: 'string', nullable: true },
            category: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                slug: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Code-barres invalide',
    schema: {
      example: {
        statusCode: 400,
        message: 'Format de code-barres invalide',
        error: 'Bad Request',
      },
    },
  })
  async checkBarcode(@Param('barcode') barcode: string) {
    // Validation basique du format
    if (!this.isValidBarcodeFormat(barcode)) {
      throw new BadRequestException('Format de code-barres invalide');
    }

    const product = await this.inventoryService.findProductByBarcode(barcode);

    return {
      exists: !!product,
      product: product || null,
    };
  }

  /**
   * Récupère les produits récemment ajoutés à l'inventaire
   */
  @Get('recent')
  @ApiOperation({
    summary: 'Récupérer les produits récents',
    description:
      "Récupère les produits récemment ajoutés à l'inventaire de l'utilisateur, triés par date d'ajout décroissante",
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre maximum de produits à retourner',
    example: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'Produits récents récupérés avec succès',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          quantity: { type: 'number' },
          expiryDate: { type: 'string', format: 'date-time', nullable: true },
          purchaseDate: { type: 'string', format: 'date-time' },
          purchasePrice: { type: 'number', nullable: true },
          storageLocation: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          product: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              brand: { type: 'string', nullable: true },
              barcode: { type: 'string', nullable: true },
              nutriscore: {
                type: 'string',
                enum: ['A', 'B', 'C', 'D', 'E'],
                nullable: true,
              },
              ecoscore: {
                type: 'string',
                enum: ['A', 'B', 'C', 'D', 'E'],
                nullable: true,
              },
              unitType: {
                type: 'string',
                enum: ['KG', 'G', 'L', 'ML', 'UNIT'],
              },
              imageUrl: { type: 'string', nullable: true },
              category: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  })
  async getRecentProducts(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: number,
  ) {
    const limitValue = limit && limit > 0 ? Math.min(limit, 50) : 5; // Max 50, défaut 5
    return await this.inventoryService.getRecentProducts(
      req.user.id,
      limitValue,
    );
  }

  /**
   * Récupère les statistiques de l'inventaire
   */
  @Get('stats')
  @ApiOperation({
    summary: "Statistiques de l'inventaire",
    description:
      "Récupère des statistiques sur l'inventaire de l'utilisateur (nombre de produits, répartition par catégorie, etc.)",
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées avec succès',
    schema: {
      type: 'object',
      properties: {
        totalItems: {
          type: 'number',
          description: "Nombre total d'éléments dans l'inventaire",
        },
        totalValue: {
          type: 'number',
          description: "Valeur totale de l'inventaire",
        },
        totalQuantity: {
          type: 'number',
          description: 'Quantité totale de produits',
        },
        averageItemValue: {
          type: 'number',
          description: 'Valeur moyenne par élément',
        },
        expiryBreakdown: {
          type: 'object',
          description: "Répartition par statut d'expiration",
          properties: {
            good: { type: 'number', description: 'Produits en bon état' },
            warning: {
              type: 'number',
              description: 'Produits à consommer bientôt (3-5 jours)',
            },
            critical: {
              type: 'number',
              description: 'Produits critiques (0-2 jours)',
            },
            expired: { type: 'number', description: 'Produits expirés' },
            unknown: {
              type: 'number',
              description: "Produits sans date d'expiration",
            },
          },
        },
        categoryBreakdown: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              categoryId: { type: 'string', format: 'uuid' },
              categoryName: { type: 'string' },
              count: { type: 'number' },
              percentage: { type: 'number' },
              totalValue: { type: 'number' },
            },
          },
        },
        storageBreakdown: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              count: { type: 'number' },
              percentage: { type: 'number' },
            },
          },
        },
        recentActivity: {
          type: 'object',
          properties: {
            itemsAddedThisWeek: { type: 'number' },
            itemsConsumedThisWeek: { type: 'number' },
            averageDaysToConsumption: { type: 'number', nullable: true },
          },
        },
      },
    },
  })
  async getInventoryStats(@Req() req: AuthenticatedRequest) {
    return await this.inventoryService.getInventoryStats(req.user.id);
  }

  /**
   * Récupère l'inventaire complet de l'utilisateur avec filtres optionnels
   */
  @Get()
  @ApiOperation({
    summary: "Récupérer l'inventaire",
    description:
      "Récupère tous les produits de l'inventaire de l'utilisateur avec possibilité de filtrer",
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filtrer par catégorie (slug de la catégorie)',
    example: 'fruits-legumes',
  })
  @ApiQuery({
    name: 'storageLocation',
    required: false,
    description: 'Filtrer par lieu de stockage',
    example: 'refrigerateur',
  })
  @ApiQuery({
    name: 'expiringWithinDays',
    required: false,
    type: Number,
    description: 'Filtrer les produits qui périment dans X jours',
    example: 7,
  })
  @ApiResponse({
    status: 200,
    description: 'Inventaire récupéré avec succès',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          quantity: { type: 'number' },
          expiryDate: { type: 'string', format: 'date-time', nullable: true },
          purchaseDate: { type: 'string', format: 'date-time' },
          purchasePrice: { type: 'number', nullable: true },
          storageLocation: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true },
          product: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              brand: { type: 'string', nullable: true },
              barcode: { type: 'string', nullable: true },
              nutriscore: {
                type: 'string',
                enum: ['A', 'B', 'C', 'D', 'E'],
                nullable: true,
              },
              ecoscore: {
                type: 'string',
                enum: ['A', 'B', 'C', 'D', 'E'],
                nullable: true,
              },
              category: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  })
  async getUserInventory(
    @Req() req: AuthenticatedRequest,
    @Query('category') category?: string,
    @Query('storageLocation') storageLocation?: string,
    @Query('expiringWithinDays') expiringWithinDays?: number,
  ) {
    const filters = {
      ...(category && { category }),
      ...(storageLocation && { storageLocation }),
      ...(expiringWithinDays && {
        expiringWithinDays: Number(expiringWithinDays),
      }),
    };

    const inventory = await this.inventoryService.getUserInventory(
      req.user.id,
      filters,
    );

    // Transformer les clés Prisma (Product, Category) en format frontend (product, category)
    return inventory.map((item) => ({
      id: item.id,
      userId: item.userId,
      quantity: item.quantity,
      expiryDate: item.expiryDate?.toISOString() ?? null,
      purchaseDate: item.purchaseDate.toISOString(),
      purchasePrice: item.purchasePrice,
      storageLocation: item.storageLocation,
      notes: item.notes,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      product: item.Product
        ? {
            id: item.Product.id,
            name: item.Product.name,
            brand: item.Product.brand,
            barcode: item.Product.barcode,
            unitType: item.Product.unitType,
            nutriscore: item.Product.nutriscore,
            ecoscore: item.Product.ecoscore,
            novascore: item.Product.novascore,
            imageUrl: item.Product.imageUrl,
            ingredients: item.Product.ingredients,
            nutrients: item.Product.nutrients,
            category: item.Product.Category
              ? {
                  id: item.Product.Category.id,
                  name: item.Product.Category.name,
                  slug: item.Product.Category.slug,
                  icon: item.Product.Category.icon,
                }
              : null,
          }
        : null,
    }));
  }

  /**
   * Met à jour un élément d'inventaire
   */
  @Put(':id')
  @ApiOperation({
    summary: "Mettre à jour un élément d'inventaire",
    description:
      "Permet de modifier les informations d'un produit dans l'inventaire",
  })
  @ApiParam({
    name: 'id',
    description: "ID de l'élément d'inventaire à modifier",
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    description: 'Champs à mettre à jour (tous optionnels)',
    schema: {
      type: 'object',
      properties: {
        quantity: { type: 'number', minimum: 0.01 },
        expiryDate: { type: 'string', format: 'date', nullable: true },
        storageLocation: { type: 'string', nullable: true },
        notes: { type: 'string', nullable: true },
        purchasePrice: { type: 'number', minimum: 0, nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Élément d'inventaire mis à jour avec succès",
  })
  @ApiResponse({
    status: 404,
    description: "Élément d'inventaire non trouvé",
  })
  async updateInventoryItem(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) inventoryItemId: string,
    @Body()
    updateData: {
      quantity?: number;
      expiryDate?: string;
      storageLocation?: string;
      notes?: string;
      purchasePrice?: number;
    },
  ) {
    return await this.inventoryService.updateInventoryItem(
      req.user.id,
      inventoryItemId,
      updateData,
    );
  }

  /**
   * Supprime un élément d'inventaire
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Supprimer un élément d'inventaire",
    description:
      "Supprime définitivement un produit de l'inventaire de l'utilisateur",
  })
  @ApiParam({
    name: 'id',
    description: "ID de l'élément d'inventaire à supprimer",
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: "Élément d'inventaire supprimé avec succès",
  })
  @ApiResponse({
    status: 404,
    description: "Élément d'inventaire non trouvé",
    schema: {
      example: {
        statusCode: 404,
        message: "Élément d'inventaire non trouvé",
        error: 'Not Found',
      },
    },
  })
  async removeInventoryItem(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) inventoryItemId: string,
  ) {
    return await this.inventoryService.removeInventoryItem(
      req.user.id,
      inventoryItemId,
    );
  }

  /**
   * Récupère un item d'inventaire spécifique
   */
  @Get(':id')
  @ApiOperation({
    summary: "Récupérer un élément d'inventaire",
    description: "Récupère les détails d'un élément spécifique de l'inventaire",
  })
  @ApiParam({
    name: 'id',
    description: "ID de l'élément d'inventaire",
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: "Élément d'inventaire récupéré avec succès",
  })
  @ApiResponse({
    status: 404,
    description: "Élément d'inventaire non trouvé",
  })
  async getInventoryItemById(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) inventoryItemId: string,
  ) {
    // Récupérer l'item via le service getUserInventory et le filtrer
    const inventory = await this.inventoryService.getUserInventory(req.user.id);
    const item = inventory.find((item) => item.id === inventoryItemId);

    if (!item) {
      throw new BadRequestException(
        `Item d'inventaire avec l'ID ${inventoryItemId} introuvable`,
      );
    }

    return {
      success: true,
      data: item,
    };
  }

  // --- MÉTHODES PRIVÉES ---

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
}
