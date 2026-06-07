import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class UpdateInvoiceItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Le nom détecté doit être une chaîne de caractères' })
  detectedName?: string;

  @ApiPropertyOptional({ minimum: 0.01 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'La quantité doit être un nombre' })
  @Min(0.01, { message: 'La quantité doit être supérieure à 0' })
  quantity?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Le prix unitaire doit être un nombre' })
  @Min(0, { message: 'Le prix unitaire doit être positif ou nul' })
  unitPrice?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Le prix total doit être un nombre' })
  @Min(0, { message: 'Le prix total doit être positif ou nul' })
  totalPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'La catégorie doit être une chaîne de caractères' })
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: "L'ID du produit doit être un UUID valide" })
  productId?: string | null;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({}, { message: 'La date de péremption doit être valide' })
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({
    message: 'Le lieu de stockage doit être une chaîne de caractères',
  })
  storageLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Les notes doivent être une chaîne de caractères' })
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\d{8,13}$/, {
    message: "L'EAN sélectionné doit contenir entre 8 et 13 chiffres",
  })
  selectedEan?: string | null;
}
