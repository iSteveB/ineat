import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsISO8601, Min, ValidateNested, IsUUID, Matches } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Enums correspondant au schéma Prisma
export enum UnitType {
  KG = 'KG',
  G = 'G',
  L = 'L',
  ML = 'ML',
  UNIT = 'UNIT',
}

export enum NutriScore {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
}

export enum EcoScore {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
}

// DTO pour les informations nutritionnelles
export class NutritionalInfoDto {
  @ApiPropertyOptional({
    description: 'Quantité de glucides pour 100g/100ml',
    example: 12.5,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Les glucides doivent être un nombre valide' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @Min(0, { message: 'Les glucides ne peuvent pas être négatifs' })
  carbohydrates?: number;

  @ApiPropertyOptional({
    description: 'Quantité de protéines pour 100g/100ml',
    example: 8.2,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Les protéines doivent être un nombre valide' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @Min(0, { message: 'Les protéines ne peuvent pas être négatives' })
  proteins?: number;

  @ApiPropertyOptional({
    description: 'Quantité de lipides pour 100g/100ml',
    example: 3.1,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Les lipides doivent être un nombre valide' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @Min(0, { message: 'Les lipides ne peuvent pas être négatifs' })
  fats?: number;

  @ApiPropertyOptional({
    description: 'Quantité de sel pour 100g/100ml',
    example: 1.2,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Le sel doit être un nombre valide' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @Min(0, { message: 'Le sel ne peut pas être négatif' })
  salt?: number;
}

// DTO principal pour l'ajout d'un produit manuel
export class AddManualProductDto {
  @ApiProperty({
    description: 'Nom du produit',
    example: 'Pommes Golden',
    minLength: 1,
  })
  @IsString({ message: 'Le nom du produit doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom du produit est obligatoire' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({
    description: 'Marque du produit',
    example: 'Leclerc Bio',
  })
  @IsOptional()
  @IsString({ message: 'La marque doit être une chaîne de caractères' })
  @Transform(({ value }) => value?.trim() || null)
  brand?: string;

  @ApiPropertyOptional({
    description: 'Code-barres du produit (EAN-8, EAN-13, UPC, etc.)',
    example: '3263859672014',
    pattern: '^(\\d{8}|\\d{12,14})$',
  })
  @IsOptional()
  @IsString({ message: 'Le code-barres doit être une chaîne de caractères' })
  @Matches(/^(\d{8}|\d{12,14})$/, {
    message: 'Le code-barres doit contenir 8, 12, 13 ou 14 chiffres (format EAN-8, UPC-A, EAN-13, etc.)'
  })
  @Transform(({ value }) => value?.trim() || null)
  barcode?: string;

  @ApiProperty({
    description: 'Catégorie du produit (slug)',
    example: 'fruits-et-legumes',
  })
  @IsString({ message: 'La catégorie doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'La catégorie est obligatoire' })
  category: string;

  @ApiProperty({
    description: 'Quantité du produit',
    example: 2,
    minimum: 0.01,
  })
  @IsNumber({}, { message: 'La quantité doit être un nombre valide' })
  @Transform(({ value }) => parseFloat(value))
  @Min(0.01, { message: 'La quantité doit être supérieure à 0' })
  quantity: number;

  @ApiProperty({
    description: 'Type d\'unité pour la quantité',
    example: UnitType.KG,
    enum: UnitType,
  })
  @IsEnum(UnitType, { message: 'Le type d\'unité doit être valide (KG, G, L, ML, UNIT)' })
  unitType: UnitType;

  @ApiProperty({
    description: 'Date d\'achat du produit',
    example: '2024-01-15',
    format: 'date',
  })
  @IsISO8601({}, { message: 'La date d\'achat doit être une date valide (format ISO 8601)' })
  purchaseDate: string;

  @ApiPropertyOptional({
    description: 'Date de péremption du produit',
    example: '2024-01-25',
    format: 'date',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'La date de péremption doit être une date valide (format ISO 8601)' })
  expiryDate?: string;

  @ApiPropertyOptional({
    description: 'Prix d\'achat du produit',
    example: 3.50,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Le prix d\'achat doit être un nombre valide' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @Min(0, { message: 'Le prix d\'achat ne peut pas être négatif' })
  purchasePrice?: number;

  @ApiPropertyOptional({
    description: 'Lieu de stockage du produit',
    example: 'refrigerateur',
  })
  @IsOptional()
  @IsString({ message: 'Le lieu de stockage doit être une chaîne de caractères' })
  @Transform(({ value }) => value?.trim() || null)
  storageLocation?: string;

  @ApiPropertyOptional({
    description: 'Notes additionnelles sur le produit',
    example: 'Produit bio acheté au marché',
  })
  @IsOptional()
  @IsString({ message: 'Les notes doivent être une chaîne de caractères' })
  @Transform(({ value }) => value?.trim() || null)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Score nutritionnel Nutri-Score',
    example: NutriScore.B,
    enum: NutriScore,
  })
  @IsOptional()
  @IsEnum(NutriScore, { message: 'Le Nutri-Score doit être valide (A, B, C, D, E)' })
  nutriscore?: NutriScore;

  @ApiPropertyOptional({
    description: 'Score environnemental Eco-Score',
    example: EcoScore.A,
    enum: EcoScore,
  })
  @IsOptional()
  @IsEnum(EcoScore, { message: 'L\'Eco-Score doit être valide (A, B, C, D, E)' })
  ecoscore?: EcoScore;

  @ApiPropertyOptional({
    description: 'Informations nutritionnelles détaillées',
    type: NutritionalInfoDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NutritionalInfoDto)
  nutritionalInfo?: NutritionalInfoDto;
}

// DTO pour la réponse après création
export class ProductCreatedResponseDto {
  @ApiProperty({
    description: 'Identifiant unique de l\'élément d\'inventaire',
    example: 'e7a3c4b2-8f1d-4e2a-9b7c-3f5e8d1a6c9b',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Nom du produit',
    example: 'Pommes Golden',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Marque du produit',
    example: 'Leclerc Bio',
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({
    description: 'Code-barres du produit',
    example: '3263859672014',
  })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({
    description: 'Catégorie du produit (slug)',
    example: 'fruits-et-legumes',
  })
  @IsString()
  category: string;

  @ApiProperty({
    description: 'Quantité du produit',
    example: 2,
  })
  @IsNumber()
  quantity: number;

  @ApiProperty({
    description: 'Type d\'unité',
    example: UnitType.KG,
    enum: UnitType,
  })
  @IsEnum(UnitType)
  unitType: UnitType;

  @ApiProperty({
    description: 'Date d\'achat',
    example: '2024-01-15T00:00:00.000Z',
  })
  @IsISO8601()
  purchaseDate: string;

  @ApiPropertyOptional({
    description: 'Date de péremption',
    example: '2024-01-25T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  expiryDate?: string;

  @ApiPropertyOptional({
    description: 'Prix d\'achat',
    example: 3.50,
  })
  @IsOptional()
  @IsNumber()
  purchasePrice?: number;

  @ApiPropertyOptional({
    description: 'Lieu de stockage',
    example: 'refrigerateur',
  })
  @IsOptional()
  @IsString()
  storageLocation?: string;

  @ApiPropertyOptional({
    description: 'Notes sur le produit',
    example: 'Produit bio acheté au marché',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Score Nutri-Score',
    example: NutriScore.B,
    enum: NutriScore,
  })
  @IsOptional()
  @IsEnum(NutriScore)
  nutriscore?: NutriScore;

  @ApiPropertyOptional({
    description: 'Score Eco-Score',
    example: EcoScore.A,
    enum: EcoScore,
  })
  @IsOptional()
  @IsEnum(EcoScore)
  ecoscore?: EcoScore;

  @ApiProperty({
    description: 'Date de création',
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsISO8601()
  createdAt: string;

  @ApiProperty({
    description: 'Date de dernière modification',
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsISO8601()
  updatedAt: string;
}