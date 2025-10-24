import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// ===== ENUMS =====

export enum ReceiptStatusFilter {
  ALL = 'ALL',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  VALIDATED = 'VALIDATED',
}

export enum ReceiptSortOrder {
  NEWEST = 'NEWEST',
  OLDEST = 'OLDEST',
  AMOUNT_HIGH = 'AMOUNT_HIGH',
  AMOUNT_LOW = 'AMOUNT_LOW',
}

// ===== DTOs DE FILTRAGE ET PAGINATION =====

/**
 * DTO pour les paramètres de requête de l'historique
 */
export class ReceiptHistoryQueryDto {
  @ApiPropertyOptional({
    description: 'Numéro de page (commence à 1)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Nombre d'éléments par page",
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filtrer par statut du ticket',
    enum: ReceiptStatusFilter,
    example: ReceiptStatusFilter.ALL,
    default: ReceiptStatusFilter.ALL,
  })
  @IsOptional()
  @IsEnum(ReceiptStatusFilter)
  status?: ReceiptStatusFilter = ReceiptStatusFilter.ALL;

  @ApiPropertyOptional({
    description: 'Ordre de tri des résultats',
    enum: ReceiptSortOrder,
    example: ReceiptSortOrder.NEWEST,
    default: ReceiptSortOrder.NEWEST,
  })
  @IsOptional()
  @IsEnum(ReceiptSortOrder)
  sortBy?: ReceiptSortOrder = ReceiptSortOrder.NEWEST;

  @ApiPropertyOptional({
    description: 'Date de début de la période (ISO 8601)',
    example: '2024-10-01T00:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Date de fin de la période (ISO 8601)',
    example: '2024-10-31T23:59:59.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par nom de magasin (recherche partielle)',
    example: 'Carrefour',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  merchantName?: string;

  @ApiPropertyOptional({
    description: 'Montant minimum du ticket',
    example: 10.0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({
    description: 'Montant maximum du ticket',
    example: 100.0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxAmount?: number;
}

// ===== DTOs DE RÉPONSE =====

/**
 * DTO pour un ticket dans l'historique (version résumée)
 */
export class ReceiptHistoryItemDto {
  @ApiProperty({
    description: 'ID du ticket',
    format: 'uuid',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Statut du ticket',
    enum: ['PROCESSING', 'COMPLETED', 'FAILED', 'VALIDATED'],
    example: 'COMPLETED',
  })
  status: string;

  @ApiProperty({
    description: "URL de l'image du ticket (miniature)",
    example: 'https://storage.example.com/receipts/ticket123_thumb.jpg',
  })
  imageUrl: string;

  @ApiPropertyOptional({
    description: 'Montant total du ticket',
    example: 15.47,
    nullable: true,
  })
  totalAmount?: number | null;

  @ApiPropertyOptional({
    description: "Date d'achat détectée",
    format: 'date-time',
    example: '2024-10-22T10:30:00.000Z',
    nullable: true,
  })
  purchaseDate?: string | null;

  @ApiPropertyOptional({
    description: 'Nom du magasin',
    example: 'Carrefour Market',
    nullable: true,
  })
  merchantName?: string | null;

  @ApiPropertyOptional({
    description: 'Adresse du magasin',
    example: '15ème Rue de Paris',
    nullable: true,
  })
  merchantAddress?: string | null;

  @ApiProperty({
    description: "Nombre total d'items détectés",
    example: 5,
  })
  totalItems: number;

  @ApiProperty({
    description: "Nombre d'items validés",
    example: 5,
  })
  validatedItems: number;

  @ApiProperty({
    description: 'Pourcentage de validation',
    example: 100,
    minimum: 0,
    maximum: 100,
  })
  validationProgress: number;

  @ApiProperty({
    description: "Indique si le ticket a été ajouté à l'inventaire",
    example: true,
  })
  addedToInventory: boolean;

  @ApiProperty({
    description: 'Date de création du ticket',
    format: 'date-time',
    example: '2024-10-22T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    format: 'date-time',
    example: '2024-10-22T10:15:00.000Z',
  })
  updatedAt: string;
}

/**
 * DTO pour les métadonnées de pagination
 */
export class PaginationMetaDto {
  @ApiProperty({
    description: 'Page actuelle',
    example: 1,
  })
  currentPage: number;

  @ApiProperty({
    description: "Nombre d'éléments par page",
    example: 20,
  })
  pageSize: number;

  @ApiProperty({
    description: "Nombre total d'éléments",
    example: 45,
  })
  totalItems: number;

  @ApiProperty({
    description: 'Nombre total de pages',
    example: 3,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Y a-t-il une page suivante',
    example: true,
  })
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Y a-t-il une page précédente',
    example: false,
  })
  hasPreviousPage: boolean;
}

/**
 * DTO pour les statistiques de l'historique
 */
export class ReceiptHistoryStatsDto {
  @ApiProperty({
    description: 'Nombre total de tickets',
    example: 45,
  })
  totalReceipts: number;

  @ApiProperty({
    description: 'Nombre de tickets traités avec succès',
    example: 42,
  })
  completedReceipts: number;

  @ApiProperty({
    description: 'Nombre de tickets en attente de validation',
    example: 2,
  })
  pendingValidation: number;

  @ApiProperty({
    description: 'Nombre de tickets en échec',
    example: 1,
  })
  failedReceipts: number;

  @ApiProperty({
    description: 'Montant total des courses (tous tickets)',
    example: 567.89,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Montant moyen par ticket',
    example: 12.62,
  })
  averageAmount: number;

  @ApiProperty({
    description: "Nombre total d'items ajoutés à l'inventaire",
    example: 180,
  })
  totalItemsAdded: number;

  @ApiProperty({
    description: 'Date du premier ticket',
    format: 'date-time',
    example: '2024-09-15T14:20:00.000Z',
    nullable: true,
  })
  firstReceiptDate?: string | null;

  @ApiProperty({
    description: 'Date du dernier ticket',
    format: 'date-time',
    example: '2024-10-22T10:00:00.000Z',
    nullable: true,
  })
  lastReceiptDate?: string | null;
}

/**
 * DTO pour l'historique complet des tickets
 */
export class ReceiptHistoryDto {
  @ApiProperty({
    description: 'Liste des tickets',
    type: [ReceiptHistoryItemDto],
  })
  receipts: ReceiptHistoryItemDto[];

  @ApiProperty({
    description: 'Métadonnées de pagination',
    type: PaginationMetaDto,
  })
  pagination: PaginationMetaDto;

  @ApiProperty({
    description: 'Statistiques globales',
    type: ReceiptHistoryStatsDto,
  })
  stats: ReceiptHistoryStatsDto;
}

/**
 * Réponse API pour l'historique des tickets
 */
export class ReceiptHistoryResponseDto {
  @ApiProperty({
    description: "Indique si l'opération a réussi",
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Historique des tickets avec pagination et statistiques',
    type: ReceiptHistoryDto,
  })
  data: ReceiptHistoryDto;

  @ApiProperty({
    description: 'Message informatif',
    example: '20 tickets récupérés (page 1/3)',
  })
  message: string;
}
