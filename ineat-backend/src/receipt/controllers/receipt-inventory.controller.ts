import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  NotFoundException,
  BadRequestException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequiresPremium } from '../../auth/decorators/requires-premium.decorator';
import { PremiumGuard } from '../../auth/guards/premium.guard';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ReceiptToInventoryService,
  ValidatedReceiptItem,
  ReceiptToInventoryResult,
} from '../services/receipt-to-inventory.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

// ===== DTOs =====

/**
 * DTO pour les options d'ajout à l'inventaire
 */
export class AddReceiptToInventoryDto {
  @ApiPropertyOptional({
    description:
      'Produits validés côté frontend à persister avant ajout à l\'inventaire',
    example: [
      {
        productId: 'receipt-item-uuid',
        eanCode: '3017624010701',
        quantity: 2,
      },
    ],
  })
  @IsOptional()
  products?: Array<{
    productId: string;
    eanCode?: string | null;
    quantity?: number | null;
  }>;

  @ApiPropertyOptional({
    description:
      "Date d'achat personnalisée (ISO 8601). Par défaut: maintenant",
    example: '2024-10-22T10:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({
    description: 'Créer automatiquement les nouveaux produits manquants',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoCreateProducts?: boolean;

  @ApiPropertyOptional({
    description: "Forcer l'ajout même en cas d'erreurs mineures",
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  forcedAdd?: boolean;
}

/**
 * DTO pour les paramètres de route
 */
export class ReceiptParamsDto {
  @ApiProperty({
    description: 'ID du ticket',
    format: 'uuid',
  })
  receiptId: string;
}

/**
 * DTO de réponse pour l'ajout à l'inventaire
 */
export class AddReceiptToInventoryResponseDto {
  @ApiProperty({
    description: "Indique si l'opération a réussi",
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: "Résultat détaillé de l'ajout à l'inventaire",
    example: {
      addedItems: [
        {
          id: 'uuid',
          productName: 'Lait demi-écrémé',
          quantity: 2,
          totalPrice: 2.58,
        },
      ],
      failedItems: [],
      budgetImpact: {
        totalAmount: 15.47,
        expenseCreated: true,
        budgetId: 'uuid',
        remainingBudget: 184.53,
      },
      summary: {
        totalItemsProcessed: 5,
        successfulItems: 5,
        failedItems: 0,
        totalAmountSpent: 15.47,
      },
    },
  })
  data: ReceiptToInventoryResult;

  @ApiProperty({
    description: 'Message de confirmation',
    example: "5 produits ajoutés à l'inventaire avec succès",
  })
  message: string;
}

/**
 * Contrôleur pour l'ajout des tickets validés à l'inventaire
 */
@ApiTags('receipt-inventory')
@Controller('receipt')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReceiptInventoryController {
  private readonly logger = new Logger(ReceiptInventoryController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly receiptToInventoryService: ReceiptToInventoryService,
  ) {}

  /**
   * Ajoute tous les items validés d'un ticket à l'inventaire
   * Intègre automatiquement avec le système de budget
   */
  @Post(':receiptId/add-to-inventory')
  @UseGuards(PremiumGuard)
  @RequiresPremium()
  @ApiOperation({
    summary: "Ajouter un ticket validé à l'inventaire",
    description: `
      Ajoute automatiquement tous les items validés d'un ticket à l'inventaire de l'utilisateur.
      
      Cette opération :
      - Traite uniquement les items marqués comme 'validated: true'
      - Crée les éléments d'inventaire avec quantités et dates d'expiration
      - Intègre automatiquement avec le système de budget (création d'expenses)
      - Gère la création de nouveaux produits si nécessaire
      - Retourne un résumé détaillé des succès et échecs
      
      ⚠️ Cette action est irréversible. Assurez-vous que tous les items sont correctement validés.
    `,
  })
  @ApiParam({
    name: 'receiptId',
    description: "ID du ticket de caisse à ajouter à l'inventaire",
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    description: "Options pour l'ajout à l'inventaire",
    type: AddReceiptToInventoryDto,
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Items ajoutés à l'inventaire avec succès",
    type: AddReceiptToInventoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket non trouvé',
    schema: {
      example: {
        statusCode: 404,
        message: 'Ticket non trouvé ou non autorisé',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Aucun item validé trouvé ou erreur de traitement',
    schema: {
      example: {
        statusCode: 400,
        message: 'Aucun item validé trouvé dans ce ticket',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Accès premium requis',
    schema: {
      example: {
        statusCode: 403,
        message: 'Premium subscription required',
        error: 'Forbidden',
      },
    },
  })
  async addReceiptToInventory(
    @Req() req: AuthenticatedRequest,
    @Param('receiptId') receiptId: string, // ✅ Extraire directement sans DTO
    @Body() options: AddReceiptToInventoryDto = {},
  ): Promise<AddReceiptToInventoryResponseDto> {
    const userId = req.user.id;

    this.logger.log(
      `Ajout du ticket ${receiptId} à l'inventaire pour l'utilisateur ${userId}`,
    );

    try {
      // 1. Vérifier que le ticket existe et appartient à l'utilisateur
      const receipt = await this.verifyReceiptOwnership(receiptId, userId);

      // 2. Persister les validations envoyées par le frontend, si présentes
      await this.applySubmittedProductValidations(
        receiptId,
        options.products,
      );

      // 3. Récupérer les items validés du ticket
      const validatedItems = await this.getValidatedReceiptItems(receiptId);

      this.logger.log(
        `📋 ${validatedItems.length} items validés trouvés dans le ticket ${receiptId}`,
      );
      this.logger.debug(
        `Items validés: ${JSON.stringify(
          validatedItems.map((i) => ({
            id: i.id,
            detectedName: i.detectedName,
            validated: i.validated,
            category: i.category,
            productId: i.productId,
          })),
        )}`,
      );

      if (validatedItems.length === 0) {
        throw new BadRequestException(
          "Aucun item validé trouvé dans ce ticket. Veuillez d'abord valider les items.",
        );
      }

      // 4. Convertir les items en format attendu par le service
      const itemsToAdd = await this.convertItemsForInventory(validatedItems);
      this.logger.debug(
        `Items convertis pour le service: ${JSON.stringify(
          itemsToAdd.map((i) => ({
            productId: i.productId,
            productName: i.productData?.name,
            categorySlug: i.productData?.categorySlug,
          })),
        )}`,
      );

      // 5. Ajouter à l'inventaire via le service
      const result =
        await this.receiptToInventoryService.addReceiptItemsToInventory(
          userId,
          itemsToAdd,
          {
            purchaseDate: options.purchaseDate
              ? new Date(options.purchaseDate)
              : undefined,
            autoCreateProducts: options.autoCreateProducts ?? true,
            forcedAdd: options.forcedAdd ?? false,
          },
        );

      // 6. Marquer le ticket comme traité
      await this.markReceiptAsProcessed(receiptId);

      // 7. Préparer la réponse
      const response: AddReceiptToInventoryResponseDto = {
        success: true,
        data: result,
        message: this.buildSuccessMessage(result),
      };

      this.logger.log(
        `Ticket ${receiptId} traité: ${result.summary.successfulItems}/${result.summary.totalItemsProcessed} items ajoutés`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'ajout du ticket ${receiptId} à l'inventaire: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException(
        "Erreur lors de l'ajout du ticket à l'inventaire",
      );
    }
  }

  // ===== MÉTHODES PRIVÉES =====

  /**
   * Vérifie que le ticket existe et appartient à l'utilisateur
   */
  private async verifyReceiptOwnership(receiptId: string, userId: string) {
    const receipt = await this.prisma.receipt.findFirst({
      where: {
        id: receiptId,
        userId,
      },
    });

    if (!receipt) {
      throw new NotFoundException('Ticket non trouvé ou non autorisé');
    }

    return receipt;
  }

  /**
   * Récupère tous les items validés d'un ticket
   */
  private async getValidatedReceiptItems(receiptId: string) {
    const items = await this.prisma.receiptItem.findMany({
      where: {
        receiptId,
        validated: true, // Seulement les items validés
      },
      include: {
        Product: {
          include: {
            Category: true,
          },
        },
      },
    });

    return items;
  }

  /**
   * Applique les validations produit envoyées par le frontend.
   *
   * Le store receipt valide localement les produits avant l'appel final.
   * Cet endpoint persiste donc ces choix pour que le service d'inventaire,
   * qui lit uniquement les ReceiptItem.validated en base, voie le même état.
   */
  private async applySubmittedProductValidations(
    receiptId: string,
    products?: AddReceiptToInventoryDto['products'],
  ): Promise<void> {
    if (!products || products.length === 0) {
      return;
    }

    for (const product of products) {
      if (!product.productId) {
        continue;
      }

      const existingProduct = product.eanCode
        ? await this.prisma.product.findUnique({
            where: { barcode: product.eanCode },
          })
        : null;

      await this.prisma.receiptItem.updateMany({
        where: {
          id: product.productId,
          receiptId,
        },
        data: {
          validated: true,
          selectedEan: product.eanCode || null,
          ...(existingProduct ? { productId: existingProduct.id } : {}),
          ...(product.quantity ? { quantity: product.quantity } : {}),
          updatedAt: new Date(),
        },
      });
    }
  }

  /**
   * Mappe une catégorie frontend vers un slug Prisma valide
   */
  private mapCategoryToSlug(category: string | null): string {
    // Mapping des catégories du frontend vers les slugs de la base
    const categoryMap: Record<string, string> = {
      'Fruits & Légumes': 'fruits-et-legumes',
      'Viandes & Poissons': 'viandes-et-poissons',
      'Produits laitiers': 'produits-laitiers',
      'Épicerie salée': 'epicerie-salée',
      'Épicerie sucrée': 'epicerie-sucrée',
      Boissons: 'boissons',
      Surgelés: 'surgelés',
      Autre: 'autres',
    };

    return categoryMap[category || ''] || 'autres';
  }

  /**
   * Convertit les items de ticket en format pour le service d'inventaire
   */
  private async convertItemsForInventory(
    receiptItems: any[],
  ): Promise<ValidatedReceiptItem[]> {
    return receiptItems.map((item) => {
      const converted: ValidatedReceiptItem = {
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        expiryDate: item.expiryDate,
        storageLocation: item.storageLocation,
        notes: item.notes,
      };

      // Si le produit existe déjà
      if (item.productId && item.product) {
        converted.productId = item.productId;
      } else {
        // Sinon, préparer les données pour créer un nouveau produit
        converted.productData = {
          name: item.detectedName,
          brand: undefined, // Pas forcément détecté dans le ticket
          barcode: item.selectedEan || undefined,
          categorySlug: this.mapCategoryToSlug(item.category), // ✅ Mapper la catégorie
          unitType: 'UNIT', // Type par défaut, pourrait être amélioré
        };
      }

      return converted;
    });
  }

  /**
   * Marque le ticket comme traité (ajouté à l'inventaire)
   */
  private async markReceiptAsProcessed(receiptId: string) {
    await this.prisma.receipt.update({
      where: { id: receiptId },
      data: {
        status: 'COMPLETED',
      },
    });
  }

  /**
   * Construit le message de succès basé sur les résultats
   */
  private buildSuccessMessage(result: ReceiptToInventoryResult): string {
    const { summary, budgetImpact } = result;

    let message = `${summary.successfulItems} produit(s) ajouté(s) à votre inventaire`;

    if (summary.failedItems > 0) {
      message += ` (${summary.failedItems} échec(s))`;
    }

    if (summary.totalAmountSpent > 0) {
      message += ` pour ${summary.totalAmountSpent.toFixed(2)}€`;
    }

    if (budgetImpact.expenseCreated && budgetImpact.warningMessage) {
      message += `. ${budgetImpact.warningMessage}`;
    }

    return message;
  }
}
