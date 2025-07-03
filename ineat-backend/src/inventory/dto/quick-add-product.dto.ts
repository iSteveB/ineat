import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class QuickAddProductDto {
  @ApiProperty({
    description: 'ID du produit existant à ajouter à l\'inventaire',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsNotEmpty({ message: 'L\'ID du produit est obligatoire' })
  @IsUUID('4', { message: 'L\'ID du produit doit être un UUID valide' })
  productId: string;

  @ApiProperty({
    description: 'Quantité du produit',
    example: 2.5,
    minimum: 0.01,
  })
  @IsNotEmpty({ message: 'La quantité est obligatoire' })
  @Type(() => Number)
  @IsNumber({}, { message: 'La quantité doit être un nombre' })
  @Min(0.01, { message: 'La quantité doit être supérieure à 0' })
  quantity: number;

  @ApiProperty({
    description: 'Date d\'achat du produit',
    example: '2024-01-15',
    type: 'string',
    format: 'date',
  })
  @IsNotEmpty({ message: 'La date d\'achat est obligatoire' })
  @IsDateString({}, { message: 'La date d\'achat doit être une date valide' })
  purchaseDate: string;

  @ApiPropertyOptional({
    description: 'Date de péremption du produit',
    example: '2024-02-15',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @IsOptional()
  @IsDateString({}, { message: 'La date de péremption doit être une date valide' })
  expiryDate?: string;

  @ApiPropertyOptional({
    description: 'Prix d\'achat unitaire du produit',
    example: 3.99,
    minimum: 0,
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Le prix d\'achat doit être un nombre' })
  @Min(0, { message: 'Le prix d\'achat doit être positif ou nul' })
  purchasePrice?: number;

  @ApiPropertyOptional({
    description: 'Lieu de stockage du produit',
    example: 'refrigerateur',
    maxLength: 100,
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'Le lieu de stockage doit être une chaîne de caractères' })
  @Transform(({ value }) => value?.trim())
  storageLocation?: string;

  @ApiPropertyOptional({
    description: 'Notes ou commentaires sur le produit',
    example: 'Acheté en promotion',
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'Les notes doivent être une chaîne de caractères' })
  @Transform(({ value }) => value?.trim())
  notes?: string;
}