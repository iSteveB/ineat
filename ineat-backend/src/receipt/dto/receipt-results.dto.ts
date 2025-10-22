import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ===== DTOs POUR LES ITEMS =====

/**
 * DTO pour un item de ticket détecté
 */
export class ReceiptItemDto {
  @ApiProperty({
    description: 'ID de l\'item de ticket',
    format: 'uuid',
    example: 'b2c3d4e5-f6g7-8901-bcde-f23456789012',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'ID du produit associé (si déjà associé)',
    format: 'uuid',
    example: 'c3d4e5f6-g7h8-9012-cdef-g34567890123',
    nullable: true,
  })
  productId?: string | null;

  @ApiProperty({
    description: 'Nom du produit détecté par l\'OCR',
    example: 'LAIT DEMI-ECREME 1L',
  })
  detectedName: string;

  @ApiProperty({
    description: 'Quantité détectée',
    example: 2,
  })
  quantity: number;

  @ApiPropertyOptional({
    description: 'Prix unitaire détecté',
    example: 1.29,
    nullable: true,
  })
  unitPrice?: number | null;

  @ApiPropertyOptional({
    description: 'Prix total pour cette ligne',
    example: 2.58,
    nullable: true,
  })
  totalPrice?: number | null;

  @ApiProperty({
    description: 'Niveau de confiance de la détection OCR (0-1)',
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  confidence: number;

  @ApiProperty({
    description: 'Indique si l\'item a été validé par l\'utilisateur',
    example: false,
  })
  validated: boolean;

  @ApiPropertyOptional({
    description: 'Catégorie devinée par l\'algorithme',
    example: 'dairy-products',
    nullable: true,
  })
  categoryGuess?: string | null;

  @ApiPropertyOptional({
    description: 'Date d\'expiration estimée/saisie pour l\'inventaire',
    format: 'date-time',
    example: '2024-12-31T23:59:59.000Z',
    nullable: true,
  })
  expiryDate?: string | null;

  @ApiPropertyOptional({
    description: 'Lieu de stockage suggéré/saisi',
    example: 'Réfrigérateur',
    nullable: true,
  })
  storageLocation?: string | null;

  @ApiPropertyOptional({
    description: 'Notes additionnelles sur l\'item',
    example: 'Produit en promotion',
    nullable: true,
  })
  notes?: string | null;

  @ApiProperty({
    description: 'Date de création de l\'item',
    format: 'date-time',
    example: '2024-10-22T10:05:00.000Z',
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
 * DTO pour les informations du produit associé (si disponible)
 */
export class AssociatedProductDto {
  @ApiProperty({
    description: 'ID du produit',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Nom du produit',
    example: 'Lait demi-écrémé',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Marque du produit',
    example: 'Lactel',
    nullable: true,
  })
  brand?: string | null;

  @ApiPropertyOptional({
    description: 'Code-barres du produit',
    example: '3560070364021',
    nullable: true,
  })
  barcode?: string | null;

  @ApiProperty({
    description: 'Type d\'unité',
    enum: ['KG', 'G', 'L', 'ML', 'UNIT'],
    example: 'L',
  })
  unitType: string;

  @ApiPropertyOptional({
    description: 'URL de l\'image du produit',
    example: 'https://images.openfoodfacts.org/product.jpg',
    nullable: true,
  })
  imageUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Nutriscore du produit',
    enum: ['A', 'B', 'C', 'D', 'E'],
    example: 'B',
    nullable: true,
  })
  nutriscore?: string | null;

  @ApiPropertyOptional({
    description: 'Eco-score du produit',
    enum: ['A', 'B', 'C', 'D', 'E'],
    example: 'C',
    nullable: true,
  })
  ecoScore?: string | null;

  @ApiProperty({
    description: 'Catégorie du produit',
    example: {
      id: 'uuid',
      name: 'Produits laitiers',
      slug: 'dairy-products',
    },
  })
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

/**
 * DTO pour un item avec son produit associé
 */
export class ReceiptItemWithProductDto extends ReceiptItemDto {
  @ApiPropertyOptional({
    description: 'Informations du produit associé (si disponible)',
    type: AssociatedProductDto,
    nullable: true,
  })
  product?: AssociatedProductDto | null;
}

// ===== DTOs POUR LES RÉSULTATS COMPLETS =====

/**
 * DTO pour les métadonnées du ticket
 */
export class ReceiptMetadataDto {
  @ApiProperty({
    description: 'ID du ticket',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Statut actuel du ticket',
    enum: ['PROCESSING', 'COMPLETED', 'FAILED', 'VALIDATED'],
    example: 'VALIDATED',
  })
  status: string;

  @ApiProperty({
    description: 'URL de l\'image du ticket',
    example: 'https://storage.example.com/receipts/ticket123.jpg',
  })
  imageUrl: string;

  @ApiPropertyOptional({
    description: 'Montant total détecté',
    example: 15.47,
    nullable: true,
  })
  totalAmount?: number | null;

  @ApiPropertyOptional({
    description: 'Date d\'achat détectée',
    format: 'date-time',
    example: '2024-10-22T10:30:00.000Z',
    nullable: true,
  })
  purchaseDate?: string | null;

  @ApiPropertyOptional({
    description: 'Nom du magasin détecté',
    example: 'Carrefour Market',
    nullable: true,
  })
  storeName?: string | null;

  @ApiPropertyOptional({
    description: 'Lieu du magasin détecté',
    example: 'Paris 15ème',
    nullable: true,
  })
  storeLocation?: string | null;

  @ApiProperty({
    description: 'Date de création du ticket',
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    format: 'date-time',
  })
  updatedAt: string;
}

/**
 * DTO pour les statistiques de validation
 */
export class ValidationStatsDto {
  @ApiProperty({
    description: 'Nombre total d\'items détectés',
    example: 5,
  })
  totalItems: number;

  @ApiProperty({
    description: 'Nombre d\'items validés',
    example: 3,
  })
  validatedItems: number;

  @ApiProperty({
    description: 'Pourcentage de validation',
    example: 60,
    minimum: 0,
    maximum: 100,
  })
  validationProgress: number;

  @ApiProperty({
    description: 'Nombre d\'items avec produits associés',
    example: 2,
  })
  itemsWithProducts: number;

  @ApiProperty({
    description: 'Nombre d\'items nécessitant la création de nouveaux produits',
    example: 3,
  })
  itemsNeedingNewProducts: number;

  @ApiProperty({
    description: 'Confiance moyenne de la détection OCR',
    example: 0.78,
    minimum: 0,
    maximum: 1,
  })
  averageConfidence: number;

  @ApiProperty({
    description: 'Indique si tous les items sont prêts pour l\'ajout à l\'inventaire',
    example: false,
  })
  readyForInventory: boolean;
}

/**
 * DTO pour les résultats complets d'un ticket
 */
export class ReceiptResultsDto {
  @ApiProperty({
    description: 'Métadonnées du ticket',
    type: ReceiptMetadataDto,
  })
  receipt: ReceiptMetadataDto;

  @ApiProperty({
    description: 'Liste des items détectés avec leurs produits associés',
    type: [ReceiptItemWithProductDto],
  })
  items: ReceiptItemWithProductDto[];

  @ApiProperty({
    description: 'Statistiques de validation',
    type: ValidationStatsDto,
  })
  stats: ValidationStatsDto;
}

/**
 * Réponse API pour les résultats d'un ticket
 */
export class ReceiptResultsResponseDto {
  @ApiProperty({
    description: 'Indique si l\'opération a réussi',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Résultats détaillés du ticket',
    type: ReceiptResultsDto,
  })
  data: ReceiptResultsDto;

  @ApiProperty({
    description: 'Message informatif',
    example: 'Résultats du ticket récupérés avec succès',
  })
  message: string;
}

/**
 * DTO pour les paramètres de route
 */
export class ReceiptResultsParamsDto {
  @ApiProperty({
    description: 'ID du ticket',
    format: 'uuid',
  })
  receiptId: string;
}