import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequiresPremium } from '../../auth/decorators/requires-premium.decorator';
import { PremiumGuard } from '../../auth/guards/premium.guard';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ReceiptHistoryDto,
  ReceiptHistoryResponseDto,
  ReceiptHistoryQueryDto,
  ReceiptHistoryItemDto,
  PaginationMetaDto,
  ReceiptHistoryStatsDto,
  ReceiptStatusFilter,
  ReceiptSortOrder,
} from '../dto/receipt-history.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Contrôleur pour l'historique des tickets
 */
@ApiTags('receipt-history')
@Controller('receipt')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReceiptHistoryController {
  private readonly logger = new Logger(ReceiptHistoryController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récupère l'historique paginé des tickets de l'utilisateur
   * Avec filtres, tri et statistiques
   */
  @Get('history')
  @UseGuards(PremiumGuard)
  @RequiresPremium()
  @ApiOperation({
    summary: "Récupérer l'historique des tickets",
    description: `
      Récupère l'historique complet des tickets de caisse de l'utilisateur avec :
      
      **Fonctionnalités** :
      - Pagination configurable (1-100 items par page)
      - Filtrage par statut, période, magasin, montant
      - Tri par date ou montant (croissant/décroissant)
      - Statistiques globales (total, moyennes, etc.)
      
      **Cas d'usage** :
      - Page d'historique dans l'application
      - Dashboard avec statistiques
      - Recherche de tickets spécifiques
      - Export de données
      
      ⚡ Optimisé pour les grandes quantités de données avec pagination.
    `,
  })
  @ApiQuery({
    name: 'page',
    description: 'Numéro de page (commence à 1)',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: "Nombre d'éléments par page (1-100)",
    required: false,
    type: Number,
    example: 20,
  })
  @ApiQuery({
    name: 'status',
    description: 'Filtrer par statut',
    required: false,
    enum: ReceiptStatusFilter,
    example: ReceiptStatusFilter.ALL,
  })
  @ApiQuery({
    name: 'sortBy',
    description: 'Ordre de tri',
    required: false,
    enum: ReceiptSortOrder,
    example: ReceiptSortOrder.NEWEST,
  })
  @ApiQuery({
    name: 'dateFrom',
    description: 'Date de début (ISO 8601)',
    required: false,
    type: String,
    example: '2024-10-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'dateTo',
    description: 'Date de fin (ISO 8601)',
    required: false,
    type: String,
    example: '2024-10-31T23:59:59.000Z',
  })
  @ApiQuery({
    name: 'merchantName',
    description: 'Filtrer par nom de magasin (recherche partielle)',
    required: false,
    type: String,
    example: 'Carrefour',
  })
  @ApiQuery({
    name: 'minAmount',
    description: 'Montant minimum',
    required: false,
    type: Number,
    example: 10.0,
  })
  @ApiQuery({
    name: 'maxAmount',
    description: 'Montant maximum',
    required: false,
    type: Number,
    example: 100.0,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Historique des tickets récupéré avec succès',
    type: ReceiptHistoryResponseDto,
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
  async getReceiptHistory(
    @Req() req: AuthenticatedRequest,
    @Query() query: ReceiptHistoryQueryDto,
  ): Promise<ReceiptHistoryResponseDto> {
    const userId = req.user.id;

    this.logger.log(
      `Récupération de l'historique des tickets pour l'utilisateur ${userId} - Page ${query.page}, Limit ${query.limit}`,
    );

    try {
      // 1. Construire les filtres de requête
      const whereClause = this.buildWhereClause(userId, query);

      // 2. Calculer la pagination
      const skip = ((query.page || 1) - 1) * (query.limit || 20);
      const take = query.limit || 20;

      // 3. Récupérer les tickets avec pagination
      const [receipts, totalCount] = await Promise.all([
        this.getReceiptsWithItems(whereClause, skip, take, query.sortBy),
        this.getTotalCount(whereClause),
      ]);

      // 4. Calculer les statistiques globales (sans pagination)
      const stats = await this.calculateGlobalStats(userId, query);

      // 5. Construire la réponse
      const historyDto: ReceiptHistoryDto = {
        receipts: receipts.map((receipt) =>
          this.mapReceiptToHistoryItem(receipt),
        ),
        pagination: this.buildPaginationMeta(
          query.page || 1,
          query.limit || 20,
          totalCount,
        ),
        stats,
      };

      const response: ReceiptHistoryResponseDto = {
        success: true,
        data: historyDto,
        message: this.buildHistoryMessage(historyDto),
      };

      this.logger.log(
        `Historique récupéré: ${receipts.length} tickets (page ${query.page}/${historyDto.pagination.totalPages})`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la récupération de l'historique pour l'utilisateur ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ===== MÉTHODES PRIVÉES =====

  /**
   * Construit la clause WHERE pour les filtres
   */
  private buildWhereClause(userId: string, query: ReceiptHistoryQueryDto) {
    const where: any = {
      userId,
    };

    // Filtre par statut
    if (query.status && query.status !== ReceiptStatusFilter.ALL) {
      where.status = query.status;
    }

    // Filtre par période
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) {
        where.createdAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.createdAt.lte = new Date(query.dateTo);
      }
    }

    // Filtre par nom de magasin
    if (query.merchantName) {
      where.merchantName = {
        contains: query.merchantName,
        mode: 'insensitive',
      };
    }

    // Filtre par montant
    if (query.minAmount !== undefined || query.maxAmount !== undefined) {
      where.totalAmount = {};
      if (query.minAmount !== undefined) {
        where.totalAmount.gte = query.minAmount;
      }
      if (query.maxAmount !== undefined) {
        where.totalAmount.lte = query.maxAmount;
      }
    }

    return where;
  }

  /**
   * Récupère les tickets avec leurs items
   */
  private async getReceiptsWithItems(
    whereClause: any,
    skip: number,
    take: number,
    sortBy?: ReceiptSortOrder,
  ) {
    // Construire l'ordre de tri
    const orderBy = this.buildOrderByClause(sortBy);

    return await this.prisma.receipt.findMany({
      where: whereClause,
      include: {
        items: {
          select: {
            id: true,
            validated: true,
          },
        },
      },
      orderBy,
      skip,
      take,
    });
  }

  /**
   * Construit la clause ORDER BY
   */
  private buildOrderByClause(sortBy?: ReceiptSortOrder) {
    switch (sortBy) {
      case ReceiptSortOrder.OLDEST:
        return { createdAt: 'asc' as const };
      case ReceiptSortOrder.AMOUNT_HIGH:
        return { totalAmount: 'desc' as const };
      case ReceiptSortOrder.AMOUNT_LOW:
        return { totalAmount: 'asc' as const };
      case ReceiptSortOrder.NEWEST:
      default:
        return { createdAt: 'desc' as const };
    }
  }

  /**
   * Compte le nombre total de tickets (pour pagination)
   */
  private async getTotalCount(whereClause: any): Promise<number> {
    return await this.prisma.receipt.count({
      where: whereClause,
    });
  }

  /**
   * Calcule les statistiques globales
   */
  private async calculateGlobalStats(
    userId: string,
    query: ReceiptHistoryQueryDto,
  ): Promise<ReceiptHistoryStatsDto> {
    // Utiliser les mêmes filtres que pour la liste (sauf pagination)
    const whereClause = this.buildWhereClause(userId, query);

    // Statistiques de base
    const [totalReceipts, statusStats, amountStats, dateStats, itemsStats] =
      await Promise.all([
        // Nombre total
        this.prisma.receipt.count({ where: whereClause }),

        // Répartition par statut
        this.prisma.receipt.groupBy({
          by: ['status'],
          where: whereClause,
          _count: { status: true },
        }),

        // Statistiques de montants
        this.prisma.receipt.aggregate({
          where: { ...whereClause, totalAmount: { not: null } },
          _sum: { totalAmount: true },
          _avg: { totalAmount: true },
        }),

        // Dates extrêmes
        this.prisma.receipt.aggregate({
          where: whereClause,
          _min: { createdAt: true },
          _max: { createdAt: true },
        }),

        // Nombre total d'items
        this.prisma.receiptItem.count({
          where: {
            receipt: whereClause,
          },
        }),
      ]);

    // Traiter les statistiques de statut
    const completedReceipts =
      statusStats.find((s) => s.status === 'COMPLETED')?._count.status || 0;
    const pendingValidation =
      statusStats.find((s) => s.status === 'VALIDATED')?._count.status || 0;
    const failedReceipts =
      statusStats.find((s) => s.status === 'FAILED')?._count.status || 0;

    return {
      totalReceipts,
      completedReceipts,
      pendingValidation,
      failedReceipts,
      totalAmount: amountStats._sum.totalAmount || 0,
      averageAmount: amountStats._avg.totalAmount || 0,
      totalItemsAdded: itemsStats,
      firstReceiptDate: dateStats._min.createdAt?.toISOString() || null,
      lastReceiptDate: dateStats._max.createdAt?.toISOString() || null,
    };
  }

  /**
   * Mappe un ticket vers l'item d'historique
   */
  private mapReceiptToHistoryItem(receipt: any): ReceiptHistoryItemDto {
    const totalItems = receipt.items?.length || 0;
    const validatedItems =
      receipt.items?.filter((item: any) => item.validated)?.length || 0;
    const validationProgress =
      totalItems > 0 ? Math.round((validatedItems / totalItems) * 100) : 0;

    return {
      id: receipt.id,
      status: receipt.status,
      imageUrl: receipt.imageUrl,
      totalAmount: receipt.totalAmount,
      purchaseDate: receipt.purchaseDate?.toISOString() || null,
      merchantName: receipt.merchantName,
      merchantAddress: receipt.merchantAddress,
      totalItems,
      validatedItems,
      validationProgress,
      addedToInventory: receipt.status === 'COMPLETED',
      createdAt: receipt.createdAt.toISOString(),
      updatedAt: receipt.updatedAt.toISOString(),
    };
  }

  /**
   * Construit les métadonnées de pagination
   */
  private buildPaginationMeta(
    page: number,
    limit: number,
    totalItems: number,
  ): PaginationMetaDto {
    const totalPages = Math.ceil(totalItems / limit);

    return {
      currentPage: page,
      pageSize: limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Construit le message de l'historique
   */
  private buildHistoryMessage(historyDto: ReceiptHistoryDto): string {
    const { receipts, pagination, stats } = historyDto;

    if (stats.totalReceipts === 0) {
      return 'Aucun ticket trouvé';
    }

    if (pagination.totalPages === 1) {
      return `${receipts.length} ticket(s) récupéré(s)`;
    }

    return `${receipts.length} ticket(s) récupéré(s) (page ${pagination.currentPage}/${pagination.totalPages})`;
  }
}
