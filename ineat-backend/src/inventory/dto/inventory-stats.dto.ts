import { ApiProperty } from '@nestjs/swagger';

export class ExpiryBreakdownDto {
  @ApiProperty({ description: 'Produits en bon état (>5 jours)' })
  good: number;

  @ApiProperty({ description: 'Produits qui expirent bientôt (3-5 jours)' })
  warning: number;

  @ApiProperty({ description: 'Produits critiques (≤2 jours)' })
  critical: number;

  @ApiProperty({ description: 'Produits expirés' })
  expired: number;

  @ApiProperty({ description: 'Produits sans date de péremption' })
  unknown: number;
}

export class CategoryBreakdownDto {
  @ApiProperty({ description: 'ID de la catégorie' })
  categoryId: string;

  @ApiProperty({ description: 'Nom de la catégorie' })
  categoryName: string;

  @ApiProperty({ description: 'Nombre de produits dans cette catégorie' })
  count: number;

  @ApiProperty({ description: 'Pourcentage du total' })
  percentage: number;

  @ApiProperty({ description: 'Valeur totale de cette catégorie' })
  totalValue: number;
}

export class StorageLocationDto {
  @ApiProperty({ description: 'Nombre de produits à cet endroit' })
  count: number;

  @ApiProperty({ description: 'Pourcentage du total' })
  percentage: number;
}

export class RecentActivityDto {
  @ApiProperty({ description: 'Produits ajoutés cette semaine' })
  itemsAddedThisWeek: number;

  @ApiProperty({ description: 'Produits consommés cette semaine' })
  itemsConsumedThisWeek: number;

  @ApiProperty({ description: 'Nombre moyen de jours avant consommation', required: false })
  averageDaysToConsumption?: number;
}

export class InventoryStatsDto {
  @ApiProperty({ description: "Nombre total d'éléments dans l'inventaire" })
  totalItems: number;

  @ApiProperty({ description: "Valeur totale de l'inventaire" })
  totalValue: number;

  @ApiProperty({ description: "Quantité totale de tous les produits" })
  totalQuantity: number;

  @ApiProperty({ description: "Valeur moyenne par article" })
  averageItemValue: number;

  @ApiProperty({ description: 'Répartition des produits par statut d\'expiration', type: ExpiryBreakdownDto })
  expiryBreakdown: ExpiryBreakdownDto;

  @ApiProperty({ description: 'Répartition par catégorie', type: [CategoryBreakdownDto] })
  categoryBreakdown: CategoryBreakdownDto[];

  @ApiProperty({ 
    description: 'Répartition par lieu de stockage',
    type: 'object',
    additionalProperties: { type: 'object', $ref: '#/components/schemas/StorageLocationDto' }
  })
  storageBreakdown: Record<string, StorageLocationDto>;

  @ApiProperty({ description: 'Activité récente', type: RecentActivityDto })
  recentActivity: RecentActivityDto;
}