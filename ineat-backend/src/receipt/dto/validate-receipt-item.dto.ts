import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsUUID, IsBoolean, Min, Max, IsEnum, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';

// ===== ENUMS =====

export enum UnitType {
  KG = 'KG',
  G = 'G',
  L = 'L',
  ML = 'ML',
  UNIT = 'UNIT',
}

// ===== DTOs POUR VALIDATION D'ITEMS =====

/**
 * DTO pour les informations d'un nouveau produit à créer
 */
export class CreateProductFromReceiptDto {
  @ApiProperty({
    description: 'Nom du produit',
    example: 'Lait demi-écrémé',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({
    description: 'Marque du produit',
    example: 'Lactel',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  brand?: string;

  @ApiPropertyOptional({
    description: 'Code-barres du produit',
    example: '3560070364021',
    pattern: '^[0-9]{8,14}$',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  barcode?: string;

  @ApiProperty({
    description: 'Slug de la catégorie',
    example: 'dairy-products',
  })
  @IsString()
  categorySlug: string;

  @ApiPropertyOptional({
    description: 'URL de l\'image du produit',
    example: 'https://example.com/product.jpg',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({
    description: 'Type d\'unité du produit',
    enum: UnitType,
    example: UnitType.L,
  })
  @IsEnum(UnitType)
  unitType: UnitType;
}

/**
 * DTO pour valider/corriger un item de ticket
 */
export class ValidateReceiptItemDto {
  // ===== INFORMATIONS PRODUIT =====

  @ApiPropertyOptional({
    description: 'ID du produit existant à associer (si trouvé dans la base)',
    format: 'uuid',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID('4')
  productId?: string;

  @ApiPropertyOptional({
    description: 'Informations pour créer un nouveau produit (si productId non fourni)',
    type: CreateProductFromReceiptDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateProductFromReceiptDto)
  newProduct?: CreateProductFromReceiptDto;

  // ===== INFORMATIONS DE TRANSACTION =====

  @ApiPropertyOptional({
    description: 'Nom du produit détecté/corrigé',
    example: 'Lait demi-écrémé 1L',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  detectedName?: string;

  @ApiPropertyOptional({
    description: 'Quantité du produit',
    example: 2,
    minimum: 0.01,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.01)
  @Max(1000)
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Prix unitaire en euros',
    example: 1.29,
    minimum: 0,
    maximum: 10000,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000)
  unitPrice?: number;

  @ApiPropertyOptional({
    description: 'Prix total pour cette ligne en euros',
    example: 2.58,
    minimum: 0,
    maximum: 10000,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000)
  totalPrice?: number;

  // ===== VALIDATION ET MÉTADONNÉES =====

  @ApiPropertyOptional({
    description: 'Indique si l\'item a été validé par l\'utilisateur',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  validated?: boolean;

  @ApiPropertyOptional({
    description: 'Niveau de confiance de la détection OCR (0-1)',
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional({
    description: 'Catégorie devinée par l\'OCR',
    example: 'dairy-products',
  })
  @IsOptional()
  @IsString()
  categoryGuess?: string;

  // ===== INFORMATIONS D'INVENTAIRE =====

  @ApiPropertyOptional({
    description: 'Date d\'expiration estimée/saisie (ISO 8601)',
    example: '2024-12-31T23:59:59.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiPropertyOptional({
    description: 'Lieu de stockage pour l\'inventaire',
    example: 'Réfrigérateur',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  storageLocation?: string;

  @ApiPropertyOptional({
    description: 'Notes additionnelles',
    example: 'Produit en promotion',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  notes?: string;
}

// ===== DTOs DE RÉPONSE =====

/**
 * Réponse après validation d'un item
 */
export class ValidatedReceiptItemResponseDto {
  @ApiProperty({
    description: 'ID de l\'item de ticket',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'ID du ticket parent',
    format: 'uuid',
  })
  receiptId: string;

  @ApiPropertyOptional({
    description: 'ID du produit associé',
    format: 'uuid',
  })
  productId?: string;

  @ApiProperty({
    description: 'Nom du produit détecté',
  })
  detectedName: string;

  @ApiProperty({
    description: 'Quantité du produit',
  })
  quantity: number;

  @ApiPropertyOptional({
    description: 'Prix unitaire',
  })
  unitPrice?: number;

  @ApiPropertyOptional({
    description: 'Prix total',
  })
  totalPrice?: number;

  @ApiProperty({
    description: 'Niveau de confiance de la détection',
  })
  confidence: number;

  @ApiProperty({
    description: 'Indique si l\'item a été validé',
  })
  validated: boolean;

  @ApiPropertyOptional({
    description: 'Catégorie devinée',
  })
  categoryGuess?: string;

  @ApiPropertyOptional({
    description: 'Date d\'expiration pour l\'inventaire',
  })
  expiryDate?: string;

  @ApiPropertyOptional({
    description: 'Lieu de stockage',
  })
  storageLocation?: string;

  @ApiPropertyOptional({
    description: 'Notes',
  })
  notes?: string;

  @ApiProperty({
    description: 'Date de création',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Date de mise à jour',
  })
  updatedAt: string;
}

/**
 * Réponse API standard pour la validation d'item
 */
export class ValidateReceiptItemApiResponseDto {
  @ApiProperty({
    description: 'Indique si l\'opération a réussi',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Item validé/mis à jour',
    type: ValidatedReceiptItemResponseDto,
  })
  data: ValidatedReceiptItemResponseDto;

  @ApiProperty({
    description: 'Message de confirmation',
    example: 'Item validé avec succès',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Informations additionnelles (ex: si nouveau produit créé)',
    example: { newProductCreated: true, productId: 'uuid' },
  })
  meta?: Record<string, unknown>;
}

// ===== DTOs POUR PARAMÈTRES =====

/**
 * DTO pour les paramètres de route
 */
export class ReceiptItemParamsDto {
  @ApiProperty({
    description: 'ID du ticket',
    format: 'uuid',
  })
  @IsUUID('4')
  receiptId: string;

  @ApiProperty({
    description: 'ID de l\'item du ticket',
    format: 'uuid',
  })
  @IsUUID('4')
  itemId: string;
}