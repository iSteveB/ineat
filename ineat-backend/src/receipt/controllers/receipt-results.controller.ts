import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  NotFoundException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequiresPremium } from '../../auth/decorators/requires-premium.decorator';
import { PremiumGuard } from '../../auth/guards/premium.guard';
import { PrismaService } from '../../prisma/prisma.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

// ===== DTOs =====

export class ReceiptMetadataDto {
  id: string;
  status: string;
  imageUrl: string | null;
  totalAmount: number | null;
  purchaseDate: string | null;
  merchantName: string | null;
  merchantAddress: string | null;
  createdAt: string;
  updatedAt: string;
}

export class AssociatedProductDto {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  unitType: string;
  imageUrl: string | null;
  nutriscore: string | null;
  ecoScore: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

export class ReceiptItemWithProductDto {
  id: string;
  productId: string | null;
  detectedName: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  confidence: number;
  validated: boolean;
  categoryGuess: string | null;
  expiryDate: string | null;
  storageLocation: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  product: AssociatedProductDto | null;
}

export class ValidationStatsDto {
  totalItems: number;
  validatedItems: number;
  validationProgress: number;
  itemsWithProducts: number;
  itemsNeedingNewProducts: number;
  averageConfidence: number;
  readyForInventory: boolean;
}

export class ReceiptResultsDto {
  receipt: ReceiptMetadataDto;
  items: ReceiptItemWithProductDto[];
  stats: ValidationStatsDto;
}

export class ReceiptResultsResponseDto {
  success: boolean;
  data: ReceiptResultsDto;
  message: string;
}

/**
 * Contrôleur pour récupérer les résultats détaillés des tickets
 */
@ApiTags('receipt-results')
@Controller('receipt')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReceiptResultsController {
  private readonly logger = new Logger(ReceiptResultsController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récupère les résultats détaillés d'un ticket avec tous ses items
   * Inclut les produits associés et les statistiques de validation
   */
  @Get(':receiptId/results')
  @UseGuards(PremiumGuard)
  @RequiresPremium()
  @ApiOperation({
    summary: "Récupérer les résultats détaillés d'un ticket",
    description: `
      Récupère tous les résultats détaillés d'un ticket de caisse avec :
      
      - **Métadonnées du ticket** : statut, montant total, magasin, date d'achat
      - **Liste complète des items** : produits détectés avec niveaux de confiance
      - **Produits associés** : informations complètes des produits déjà dans la base
      - **Statistiques de validation** : progression, items prêts, confiance moyenne
      
      ⚠️ Ce endpoint est conçu pour afficher la page de validation/correction des résultats OCR.
    `,
  })
  @ApiParam({
    name: 'receiptId',
    description: 'ID du ticket de caisse',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Résultats du ticket récupérés avec succès',
    type: ReceiptResultsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket non trouvé',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Ticket pas encore traité ou en erreur',
    schema: {
      example: {
        statusCode: 400,
        message:
          'Ticket en cours de traitement, résultats pas encore disponibles',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Accès premium requis',
  })
  async getReceiptResults(
    @Req() req: AuthenticatedRequest,
    @Param('receiptId') receiptId: string, // ← Directement sans DTO
  ): Promise<ReceiptResultsResponseDto> {
    const userId = req.user.id;

    this.logger.log(
      `Récupération des résultats du ticket ${receiptId} pour l'utilisateur ${userId}`,
    );

    try {
      // Récupérer le ticket avec tous ses items et produits associés
      const receipt = await this.findReceiptWithFullDetails(receiptId, userId);

      // Vérifier que le ticket est dans un état permettant la lecture des résultats
      this.validateReceiptStatus(receipt);

      // Construire la réponse avec toutes les données
      const resultsDto: ReceiptResultsDto = {
        receipt: this.mapReceiptMetadata(receipt),
        items: await this.mapReceiptItems(receipt.items),
        stats: this.calculateValidationStats(receipt.items),
      };

      const response: ReceiptResultsResponseDto = {
        success: true,
        data: resultsDto,
        message: this.buildResultsMessage(receipt.status, resultsDto.stats),
      };

      this.logger.log(
        `Résultats du ticket ${receiptId} récupérés: ${resultsDto.items.length} items`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la récupération des résultats du ticket ${receiptId}: ${error.message}`,
        error.stack,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new NotFoundException(
        'Erreur lors de la récupération des résultats du ticket',
      );
    }
  }

  // ===== MÉTHODES PRIVÉES =====

  private async findReceiptWithFullDetails(receiptId: string, userId: string) {
    const receipt = await this.prisma.receipt.findFirst({
      where: {
        id: receiptId,
        userId,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException('Ticket non trouvé ou non autorisé');
    }

    return receipt;
  }

  private validateReceiptStatus(receipt: any): void {
    if (receipt.status === 'PROCESSING') {
      throw new NotFoundException(
        'Ticket en cours de traitement, résultats pas encore disponibles',
      );
    }

    if (receipt.status === 'FAILED') {
      throw new NotFoundException(
        'Erreur lors du traitement du ticket, aucun résultat disponible',
      );
    }
  }

  private mapReceiptMetadata(receipt: any): ReceiptMetadataDto {
    return {
      id: receipt.id,
      status: receipt.status,
      imageUrl: receipt.imageUrl,
      totalAmount: receipt.totalAmount,
      purchaseDate: receipt.purchaseDate?.toISOString() || null,
      merchantName: receipt.merchantName,
      merchantAddress: receipt.merchantAddress,
      createdAt: receipt.createdAt.toISOString(),
      updatedAt: receipt.updatedAt.toISOString(),
    };
  }

  /**
   * Mappe les items du ticket avec leurs produits associés
   */
  private async mapReceiptItems(
    items: any[],
  ): Promise<ReceiptItemWithProductDto[]> {
    return items.map((item) => ({
      id: item.id,
      productId: item.productId,
      detectedName: item.detectedName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      confidence: item.confidence,
      validated: item.validated,
      categoryGuess: item.category, // ✅ Mapper category → categoryGuess pour le frontend
      expiryDate: item.expiryDate?.toISOString() || null,
      storageLocation: item.storageLocation,
      notes: item.notes,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      product: item.product ? this.mapAssociatedProduct(item.product) : null,
    }));
  }

  private mapAssociatedProduct(product: any): AssociatedProductDto {
    return {
      id: product.id,
      name: product.name,
      brand: product.brand,
      barcode: product.barcode,
      unitType: product.unitType,
      imageUrl: product.imageUrl,
      nutriscore: product.nutriscore,
      ecoScore: product.ecoScore,
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
      },
    };
  }

  private calculateValidationStats(items: any[]): ValidationStatsDto {
    const totalItems = items.length;
    const validatedItems = items.filter((item) => item.validated).length;
    const itemsWithProducts = items.filter((item) => item.productId).length;
    const itemsNeedingNewProducts = totalItems - itemsWithProducts;

    // Calcul de la confiance moyenne
    const totalConfidence = items.reduce(
      (sum, item) => sum + (item.confidence || 0),
      0,
    );
    const averageConfidence = totalItems > 0 ? totalConfidence / totalItems : 0;

    const validationProgress =
      totalItems > 0 ? Math.round((validatedItems / totalItems) * 100) : 0;
    const readyForInventory = totalItems > 0 && validatedItems === totalItems;

    return {
      totalItems,
      validatedItems,
      validationProgress,
      itemsWithProducts,
      itemsNeedingNewProducts,
      averageConfidence: Math.round(averageConfidence * 1000) / 1000,
      readyForInventory,
    };
  }

  /**
   * Construit le message des résultats
   */
  private buildResultsMessage(
    status: string,
    stats: ValidationStatsDto,
  ): string {
    const { totalItems, validatedItems, readyForInventory } = stats;

    if (status === 'COMPLETED') {
      return "Ticket traité et ajouté à l'inventaire avec succès";
    }

    if (readyForInventory) {
      return `${totalItems} item(s) détecté(s) et validé(s), prêt pour l'ajout à l'inventaire`;
    }

    if (validatedItems === 0) {
      return `${totalItems} item(s) détecté(s), validation requise avant ajout à l'inventaire`;
    }

    return `${validatedItems}/${totalItems} item(s) validé(s), validation en cours`;
  }
}
