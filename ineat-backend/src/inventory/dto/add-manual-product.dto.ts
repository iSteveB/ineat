import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsISO8601, Min, ValidateNested, IsUUID } from 'class-validator';
import { Transform, Type } from 'class-transformer';

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
  @IsOptional()
  @IsNumber({}, { message: 'Les glucides doivent être un nombre valide' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @Min(0, { message: 'Les glucides ne peuvent pas être négatifs' })
  carbohydrates?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Les protéines doivent être un nombre valide' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @Min(0, { message: 'Les protéines ne peuvent pas être négatives' })
  proteins?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Les lipides doivent être un nombre valide' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @Min(0, { message: 'Les lipides ne peuvent pas être négatifs' })
  fats?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Le sel doit être un nombre valide' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @Min(0, { message: 'Le sel ne peut pas être négatif' })
  salt?: number;
}

// DTO principal pour l'ajout d'un produit manuel
export class AddManualProductDto {
  @IsString({ message: 'Le nom du produit doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom du produit est obligatoire' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsString({ message: 'La marque doit être une chaîne de caractères' })
  @Transform(({ value }) => value?.trim() || null)
  brand?: string;

  @IsString({ message: 'La catégorie doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'La catégorie est obligatoire' })
  category: string;

  @IsNumber({}, { message: 'La quantité doit être un nombre valide' })
  @Transform(({ value }) => parseFloat(value))
  @Min(0.01, { message: 'La quantité doit être supérieure à 0' })
  quantity: number;

  @IsEnum(UnitType, { message: 'Le type d\'unité doit être valide (KG, G, L, ML, UNIT)' })
  unitType: UnitType;

  @IsISO8601({}, { message: 'La date d\'achat doit être une date valide (format ISO 8601)' })
  purchaseDate: string;

  @IsOptional()
  @IsISO8601({}, { message: 'La date de péremption doit être une date valide (format ISO 8601)' })
  expiryDate?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Le prix d\'achat doit être un nombre valide' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @Min(0, { message: 'Le prix d\'achat ne peut pas être négatif' })
  purchasePrice?: number;

  @IsOptional()
  @IsString({ message: 'Le lieu de stockage doit être une chaîne de caractères' })
  @Transform(({ value }) => value?.trim() || null)
  storageLocation?: string;

  @IsOptional()
  @IsString({ message: 'Les notes doivent être une chaîne de caractères' })
  @Transform(({ value }) => value?.trim() || null)
  notes?: string;

  @IsOptional()
  @IsEnum(NutriScore, { message: 'Le Nutri-Score doit être valide (A, B, C, D, E)' })
  nutriscore?: NutriScore;

  @IsOptional()
  @IsEnum(EcoScore, { message: 'L\'Eco-Score doit être valide (A, B, C, D, E)' })
  ecoscore?: EcoScore;

  @IsOptional()
  @ValidateNested()
  @Type(() => NutritionalInfoDto)
  nutritionalInfo?: NutritionalInfoDto;
}

// DTO pour la réponse après création
export class ProductCreatedResponseDto {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsString()
  category: string;

  @IsNumber()
  quantity: number;

  @IsEnum(UnitType)
  unitType: UnitType;

  @IsISO8601()
  purchaseDate: string;

  @IsOptional()
  @IsISO8601()
  expiryDate?: string;

  @IsOptional()
  @IsNumber()
  purchasePrice?: number;

  @IsOptional()
  @IsString()
  storageLocation?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(NutriScore)
  nutriscore?: NutriScore;

  @IsOptional()
  @IsEnum(EcoScore)
  ecoscore?: EcoScore;

  @IsISO8601()
  createdAt: string;

  @IsISO8601()
  updatedAt: string;
}