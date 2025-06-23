import { 
  IsString, 
  IsNotEmpty, 
  MinLength, 
  IsInt, 
  Min, 
  Max, 
  IsOptional,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NutriScore, EcoScore, UnitType } from '../../DTOs';

/**
 * DTO pour les paramètres de recherche
 */
export class SearchProductsDto {
  @ApiProperty({
    description: 'Terme de recherche (nom ou marque du produit)',
    example: 'lait',
    minLength: 2,
  })
  @IsString({ message: 'Le terme de recherche doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le terme de recherche ne peut pas être vide' })
  @MinLength(2, { message: 'Le terme de recherche doit contenir au moins 2 caractères' })
  @Transform(({ value }) => value?.trim())
  q: string;

  @ApiPropertyOptional({
    description: 'Nombre maximum de résultats à retourner',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La limite doit être un nombre entier' })
  @Min(1, { message: 'La limite doit être au moins 1' })
  @Max(50, { message: 'La limite ne peut pas dépasser 50' })
  limit: number = 10;
}

/**
 * DTO pour la catégorie dans les résultats de recherche
 */
export class CategoryInfoDto {
  @ApiProperty({
    description: 'Identifiant unique de la catégorie',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Nom de la catégorie',
    example: 'Produits laitiers',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Slug de la catégorie',
    example: 'produits-laitiers',
  })
  @IsString()
  slug: string;

  @ApiPropertyOptional({
    description: 'Icône de la catégorie',
    example: '🥛',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  icon?: string | null;
}

/**
 * DTO pour les résultats de recherche de produits
 */
export class ProductSearchResultDto {
  @ApiProperty({
    description: 'Identifiant unique du produit',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Nom du produit',
    example: 'Lait demi-écrémé',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Marque du produit',
    example: 'Lactel',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  brand?: string | null;

  @ApiPropertyOptional({
    description: 'Nutri-Score du produit',
    enum: NutriScore,
    example: NutriScore.B,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(NutriScore)
  nutriscore?: NutriScore | null;

  @ApiPropertyOptional({
    description: 'Eco-Score du produit',
    enum: EcoScore,
    example: EcoScore.B,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(EcoScore)
  ecoScore?: EcoScore | null;

  @ApiPropertyOptional({
    description: 'URL de l\'image du produit',
    example: 'https://example.com/product-image.jpg',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @ApiProperty({
    description: 'Type d\'unité du produit',
    enum: UnitType,
    example: UnitType.L,
  })
  @IsEnum(UnitType)
  unitType: UnitType;

  @ApiProperty({
    description: 'Catégorie du produit',
    type: CategoryInfoDto,
  })
  category: CategoryInfoDto;

  @ApiPropertyOptional({
    description: 'Code-barres du produit',
    example: '3520836980013',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  barcode?: string | null;

  @ApiPropertyOptional({
    description: 'Score de pertinence (pour le tri des résultats)',
    example: 0.95,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  relevanceScore?: number;
}

/**
 * DTO pour l'ajout rapide d'un produit existant
 */
export class QuickAddProductDto {
  @ApiProperty({
    description: 'ID du produit existant à ajouter',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'L\'ID du produit doit être un UUID valide' })
  productId: string;

  @ApiProperty({
    description: 'Quantité à ajouter',
    example: 2,
    minimum: 0.01,
  })
  @IsInt({ message: 'La quantité doit être un nombre' })
  @Min(0.01, { message: 'La quantité doit être supérieure à 0' })
  @Transform(({ value }) => parseFloat(value))
  quantity: number;

  @ApiProperty({
    description: 'Date d\'achat',
    example: '2024-01-15',
  })
  @IsString()
  @IsNotEmpty({ message: 'La date d\'achat est obligatoire' })
  purchaseDate: string;

  @ApiPropertyOptional({
    description: 'Date de péremption',
    example: '2024-02-15',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiPropertyOptional({
    description: 'Prix d\'achat',
    example: 1.99,
    minimum: 0,
    nullable: true,
  })
  @IsOptional()
  @Min(0, { message: 'Le prix d\'achat ne peut pas être négatif' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  purchasePrice?: number;

  @ApiPropertyOptional({
    description: 'Lieu de stockage',
    example: 'Réfrigérateur',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim() || null)
  storageLocation?: string;

  @ApiPropertyOptional({
    description: 'Notes additionnelles',
    example: 'À consommer rapidement',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim() || null)
  notes?: string;
}