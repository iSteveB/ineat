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

/**
 * DTO de réponse pour le statut
 */
export class ReceiptStatusDto {
  id: string;
  status: string;
  imageUrl: string | null;
  totalAmount: number | null;
  purchaseDate: string | null;
  merchantName: string | null;
  merchantAddress: string | null;
  totalItems: number;
  validatedItems: number;
  validationProgress: number;
  readyForInventory: boolean;
  addedToInventory: boolean;
  createdAt: string;
  updatedAt: string;
  estimatedTimeRemaining: number | null;
  errorMessage: string | null;
}

export class ReceiptStatusResponseDto {
  success: boolean;
  data: ReceiptStatusDto;
  message: string;
}

/**
 * Contrôleur pour récupérer le statut des tickets
 */
@ApiTags('receipt-status')
@Controller('receipt')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReceiptStatusController {
  private readonly logger = new Logger(ReceiptStatusController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récupère le statut détaillé d'un ticket
   * Utile pour le polling côté frontend pendant le traitement
   */
  @Get(':receiptId/status')
  @UseGuards(PremiumGuard)
  @RequiresPremium()
  @ApiOperation({
    summary: "Récupérer le statut d'un ticket",
    description: `
      Récupère le statut détaillé d'un ticket de caisse et ses informations de traitement.
      
      Informations fournies :
      - Statut actuel (PROCESSING, COMPLETED, FAILED, VALIDATED)
      - Progression de la validation par l'utilisateur
      - Détails détectés (montant, magasin, date)
      - Nombre d'items détectés vs validés
      - Temps estimé restant (si en traitement)
      - Messages d'erreur (si échec)
      
      ⏱️ Endpoint optimisé pour le polling côté frontend.
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
    description: 'Statut du ticket récupéré avec succès',
    type: ReceiptStatusResponseDto,
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
  async getReceiptStatus(
    @Req() req: AuthenticatedRequest,
    @Param('receiptId') receiptId: string, // ← Directement sans DTO
  ): Promise<ReceiptStatusResponseDto> {
    const userId = req.user.id;

    this.logger.log(
      `Récupération du statut du ticket ${receiptId} pour l'utilisateur ${userId}`,
    );

    try {
      // Récupérer le ticket avec ses items
      const receipt = await this.findReceiptWithItems(receiptId, userId);

      // Calculer les métriques de progression
      const metrics = this.calculateProgressMetrics(receipt);

      // Construire le DTO de réponse
      const statusDto: ReceiptStatusDto = {
        id: receipt.id,
        status: receipt.status,
        imageUrl: receipt.imageUrl,
        totalAmount: receipt.totalAmount,
        purchaseDate: receipt.purchaseDate?.toISOString() || null,
        merchantName: receipt.merchantName,
        merchantAddress: receipt.merchantAddress,
        totalItems: metrics.totalItems,
        validatedItems: metrics.validatedItems,
        validationProgress: metrics.validationProgress,
        readyForInventory: metrics.readyForInventory,
        addedToInventory: receipt.status === 'COMPLETED',
        createdAt: receipt.createdAt.toISOString(),
        updatedAt: receipt.updatedAt.toISOString(),
        estimatedTimeRemaining: this.calculateEstimatedTime(receipt),
        errorMessage: this.extractErrorMessage(receipt),
      };

      const response: ReceiptStatusResponseDto = {
        success: true,
        data: statusDto,
        message: this.buildStatusMessage(receipt.status, metrics),
      };

      return response;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la récupération du statut du ticket ${receiptId}: ${error.message}`,
        error.stack,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new NotFoundException(
        'Erreur lors de la récupération du statut du ticket',
      );
    }
  }

  // ===== MÉTHODES PRIVÉES =====

  /**
   * Trouve le ticket avec ses items
   */
  private async findReceiptWithItems(receiptId: string, userId: string) {
    const receipt = await this.prisma.receipt.findFirst({
      where: {
        id: receiptId,
        userId,
      },
      include: {
        ReceiptItem: true,
      },
    });

    if (!receipt) {
      throw new NotFoundException('Ticket non trouvé ou non autorisé');
    }

    return receipt;
  }

  /**
   * Calcule les métriques de progression
   */
  private calculateProgressMetrics(receipt: any) {
    const totalItems = receipt.items?.length || 0;
    const validatedItems =
      receipt.items?.filter((item: any) => item.validated)?.length || 0;

    const validationProgress =
      totalItems > 0 ? Math.round((validatedItems / totalItems) * 100) : 0;
    const readyForInventory = totalItems > 0 && validatedItems === totalItems;

    return {
      totalItems,
      validatedItems,
      validationProgress,
      readyForInventory,
    };
  }

  /**
   * Calcule le temps estimé restant (pour status PROCESSING)
   */
  private calculateEstimatedTime(receipt: any): number | null {
    if (receipt.status !== 'PROCESSING') {
      return null;
    }

    // Calcul simple basé sur le temps écoulé depuis la création
    const createdAt = new Date(receipt.createdAt);
    const now = new Date();
    const elapsedSeconds = Math.floor(
      (now.getTime() - createdAt.getTime()) / 1000,
    );

    // Temps estimé moyen pour un ticket : 30 secondes
    const averageProcessingTime = 30;
    const remainingTime = Math.max(0, averageProcessingTime - elapsedSeconds);

    return remainingTime;
  }

  /**
   * Extrait le message d'erreur depuis les données du ticket
   */
  private extractErrorMessage(receipt: any): string | null {
    if (receipt.status !== 'FAILED') {
      return null;
    }

    // Si vous stockez l'erreur dans un champ dédié
    if (receipt.errorMessage) {
      return receipt.errorMessage;
    }

    // Si vous stockez l'erreur dans rawOcrData
    if (receipt.rawOcrData && receipt.rawOcrData.error) {
      return receipt.rawOcrData.error;
    }

    return 'Erreur lors du traitement du ticket';
  }

  /**
   * Construit le message de statut approprié
   */
  private buildStatusMessage(status: string, metrics: any): string {
    switch (status) {
      case 'PROCESSING':
        return 'Ticket en cours de traitement...';

      case 'COMPLETED':
        return "Ticket traité et ajouté à l'inventaire avec succès";

      case 'FAILED':
        return 'Erreur lors du traitement du ticket';

      case 'VALIDATED':
        if (metrics.readyForInventory) {
          return "Ticket validé, prêt à être ajouté à l'inventaire";
        } else {
          return `Validation en cours (${metrics.validatedItems}/${metrics.totalItems} items validés)`;
        }

      default:
        return 'Statut du ticket récupéré';
    }
  }
}
