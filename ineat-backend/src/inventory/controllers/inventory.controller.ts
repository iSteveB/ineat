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
import { InventoryService } from '../services/inventory.service';
import {
  AddManualProductDto,
  ProductCreatedResponseDto,
  QuickAddProductDto,
} from '../../DTOs';
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
      "Permet à un utilisateur d'ajouter un produit à son inventaire en saisissant manuellement les informations",
  })
  @ApiBody({
    type: AddManualProductDto,
    description: "Informations du produit à ajouter à l'inventaire",
  })
  @ApiResponse({
    status: 201,
    description: "Produit ajouté avec succès à l'inventaire",
    type: ProductCreatedResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Données invalides (validation échouée, dates incohérentes, etc.)',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Le nom du produit est obligatoire',
          'La quantité doit être supérieure à 0',
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
      "Produit déjà présent dans l'inventaire avec les mêmes caractéristiques",
    schema: {
      example: {
        statusCode: 409,
        message:
          'Ce produit existe déjà dans votre inventaire avec les mêmes caractéristiques',
        error: 'Conflict',
      },
    },
  })
  async addManualProduct(
    @Req() req: AuthenticatedRequest,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    addProductDto: AddManualProductDto,
  ): Promise<ProductCreatedResponseDto> {
    return await this.inventoryService.addManualProduct(
      req.user.id,
      addProductDto,
    );
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
              nutriscore: {
                type: 'string',
                enum: ['A', 'B', 'C', 'D', 'E'],
                nullable: true,
              },
              ecoScore: {
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
              nutriscore: {
                type: 'string',
                enum: ['A', 'B', 'C', 'D', 'E'],
                nullable: true,
              },
              ecoScore: {
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

    return await this.inventoryService.getUserInventory(req.user.id, filters);
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
          description: "Valeur totale de l'inventaire (si prix renseignés)",
        },
        expiringInWeek: {
          type: 'number',
          description: 'Nombre de produits périment dans la semaine',
        },
        categoriesBreakdown: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              categoryName: { type: 'string' },
              count: { type: 'number' },
              percentage: { type: 'number' },
            },
          },
        },
        storageBreakdown: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
      },
    },
  })
  async getInventoryStats(@Req() req: AuthenticatedRequest) {
    // Cette méthode pourrait être implémentée dans le service plus tard
    // Pour l'instant, on retourne une structure basique
    const inventory = await this.inventoryService.getUserInventory(req.user.id);

    const totalItems = inventory.length;
    const totalValue = inventory.reduce((sum, item) => {
      return (
        sum + (item.purchasePrice ? item.purchasePrice * item.quantity : 0)
      );
    }, 0);

    const expiringInWeek = inventory.filter((item) => {
      if (!item.expiryDate) return false;
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return new Date(item.expiryDate) <= weekFromNow;
    }).length;

    return {
      totalItems,
      totalValue: Math.round(totalValue * 100) / 100, // Arrondi à 2 décimales
      expiringInWeek,
      categoriesBreakdown: [], // À implémenter plus tard si nécessaire
      storageBreakdown: {}, // À implémenter plus tard si nécessaire
    };
  }
}
