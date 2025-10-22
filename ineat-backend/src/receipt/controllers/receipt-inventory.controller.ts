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
} from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequiresPremium } from '../../auth/decorators/requires-premium.decorator';
import { PremiumGuard } from '../../auth/guards/premium.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ReceiptToInventoryService, ValidatedReceiptItem, ReceiptToInventoryResult } from '../services/receipt-to-inventory.service';

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
    description: 'Date d\'achat personnalisée (ISO 8601). Par défaut: maintenant',
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
    description: 'Forcer l\'ajout même en cas d\'erreurs mineures',
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
    description: 'Indique si l\'opération a réussi',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Résultat détaillé de l\'ajout à l\'inventaire',
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
    example: '5 produits ajoutés à l\'inventaire avec succès',
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
    summary: 'Ajouter un ticket validé à l\'inventaire',
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
    description: 'ID du ticket de caisse à ajouter à l\'inventaire',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    description: 'Options pour l\'ajout à l\'inventaire',
    type: AddReceiptToInventoryDto,
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Items ajoutés à l\'inventaire avec succès',
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
    @Param() params: ReceiptParamsDto,
    @Body() options: AddReceiptToInventoryDto = {},
  ): Promise<AddReceiptToInventoryResponseDto> {
    const { receiptId } = params;
    const userId = req.user.id;

    this.logger.log(`Ajout du ticket ${receiptId} à l'inventaire pour l'utilisateur ${userId}`);

    try {
      // 1. Vérifier que le ticket existe et appartient à l'utilisateur
      const receipt = await this.verifyReceiptOwnership(receiptId, userId);

      // 2. Récupérer les items validés du ticket
      const validatedItems = await this.getValidatedReceiptItems(receiptId);

      if (validatedItems.length === 0) {
        throw new BadRequestException('Aucun item validé trouvé dans ce ticket. Veuillez d\'abord valider les items.');
      }

      // 3. Convertir les items en format attendu par le service
      const itemsToAdd = await this.convertItemsForInventory(validatedItems);

      // 4. Ajouter à l'inventaire via le service
      const result = await this.receiptToInventoryService.addReceiptItemsToInventory(
        userId,
        itemsToAdd,
        {
          purchaseDate: options.purchaseDate ? new Date(options.purchaseDate) : undefined,
          autoCreateProducts: options.autoCreateProducts ?? true,
          forcedAdd: options.forcedAdd ?? false,
        },
      );

      // 5. Marquer le ticket comme traité
      await this.markReceiptAsProcessed(receiptId);

      // 6. Préparer la réponse
      const response: AddReceiptToInventoryResponseDto = {
        success: true,
        data: result,
        message: this.buildSuccessMessage(result),
      };

      this.logger.log(`Ticket ${receiptId} traité: ${result.summary.successfulItems}/${result.summary.totalItemsProcessed} items ajoutés`);
      return response;

    } catch (error) {
      this.logger.error(`Erreur lors de l'ajout du ticket ${receiptId} à l'inventaire: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException('Erreur lors de l\'ajout du ticket à l\'inventaire');
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
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    return items;
  }

  /**
   * Convertit les items de ticket en format pour le service d'inventaire
   */
  private async convertItemsForInventory(receiptItems: any[]): Promise<ValidatedReceiptItem[]> {
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
          barcode: undefined, // Pas forcément détecté dans le ticket
          categorySlug: item.categoryGuess || 'other', // Catégorie par défaut
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
        status: 'COMPLETED', // Assurez-vous que ce statut existe dans votre enum
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