/**
 * DTOs pour le module Receipt
 *
 * Data Transfer Objects pour la validation et la transformation des données
 * des requêtes et réponses de l'API Receipt/Invoice
 *
 * @module receipt/dto/receipt.dto
 */

import {
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsDate,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '../interfaces/ocr-provider.interface';

/**
 * DTO pour uploader un document (ticket ou facture)
 */
export class UploadReceiptDto {
  @ApiProperty({
    description: 'Type de document uploadé',
    enum: DocumentType,
    example: DocumentType.RECEIPT_IMAGE,
  })
  @IsNotEmpty({ message: 'Le type de document est requis' })
  @IsEnum(DocumentType, {
    message: 'Type de document invalide',
  })
  documentType: DocumentType;

  @ApiPropertyOptional({
    description: 'Nom du magasin (optionnel, pour pré-remplissage)',
    example: 'Carrefour Market',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  merchantName?: string;

  @ApiPropertyOptional({
    description: 'Adresse du magasin (optionnel)',
    example: '123 Rue de la République, 75015 Paris',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  merchantAddress?: string;
}

/**
 * DTO pour un item/ligne de produit extrait
 */
export class ReceiptItemDto {
  @ApiProperty({
    description: 'Description/nom du produit',
    example: 'Pain complet bio',
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Quantité',
    example: 2,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity: number | null;

  @ApiPropertyOptional({
    description: 'Prix unitaire en euros',
    example: 1.25,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice: number | null;

  @ApiPropertyOptional({
    description: 'Prix total de la ligne en euros',
    example: 2.5,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPrice: number | null;

  @ApiProperty({
    description: 'Score de confiance de la détection (0-1)',
    example: 0.95,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiPropertyOptional({
    description: 'Code produit (EAN/code-barres)',
    example: '3270190084488',
  })
  @IsOptional()
  @IsString()
  productCode?: string | null;

  @ApiPropertyOptional({
    description: 'Catégorie du produit',
    example: 'Boulangerie',
  })
  @IsOptional()
  @IsString()
  category?: string | null;

  @ApiPropertyOptional({
    description: 'Réduction appliquée en euros',
    example: 0.5,
  })
  @IsOptional()
  @IsNumber()
  discount?: number | null;
}

/**
 * DTO pour les données extraites du document
 */
export class ReceiptDataDto {
  @ApiPropertyOptional({
    description: 'Nom du magasin',
    example: 'Carrefour Market',
  })
  @IsOptional()
  @IsString()
  merchantName: string | null;

  @ApiPropertyOptional({
    description: 'Adresse du magasin',
    example: '123 Rue de la République, 75015 Paris',
  })
  @IsOptional()
  @IsString()
  merchantAddress: string | null;

  @ApiPropertyOptional({
    description: 'Montant total TTC en euros',
    example: 45.67,
  })
  @IsOptional()
  @IsNumber()
  totalAmount: number | null;

  @ApiPropertyOptional({
    description: "Date de l'achat",
    example: '2025-10-14T14:30:00Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  purchaseDate: Date | null;

  @ApiProperty({
    description: 'Liste des articles détectés',
    type: [ReceiptItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiptItemDto)
  lineItems: ReceiptItemDto[];

  @ApiProperty({
    description: 'Score de confiance global (0-1)',
    example: 0.92,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiPropertyOptional({
    description: 'Numéro de facture (factures drive)',
    example: 'INV-2025-001234',
  })
  @IsOptional()
  @IsString()
  invoiceNumber?: string | null;

  @ApiPropertyOptional({
    description: 'Numéro de commande (factures drive)',
    example: 'CMD-789456',
  })
  @IsOptional()
  @IsString()
  orderNumber?: string | null;
}

/**
 * DTO pour le résultat du traitement OCR
 */
export class OcrResultDto {
  @ApiProperty({
    description: 'Indique si le traitement a réussi',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Données extraites du document',
    type: ReceiptDataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReceiptDataDto)
  data?: ReceiptDataDto;

  @ApiPropertyOptional({
    description: "Message d'erreur en cas d'échec",
    example: 'Image de mauvaise qualité',
  })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiProperty({
    description: 'Temps de traitement en millisecondes',
    example: 1250,
  })
  @IsNumber()
  processingTime: number;

  @ApiProperty({
    description: 'Provider OCR utilisé',
    example: 'mindee',
  })
  @IsString()
  provider: string;

  @ApiProperty({
    description: 'Type de document traité',
    enum: DocumentType,
    example: DocumentType.RECEIPT_IMAGE,
  })
  @IsEnum(DocumentType)
  documentType: DocumentType;
}

/**
 * DTO pour la réponse d'upload de document
 */
export class UploadReceiptResponseDto {
  @ApiProperty({
    description: 'ID unique du receipt créé',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  receiptId: string;

  @ApiProperty({
    description: 'Statut du traitement',
    example: 'PROCESSING',
    enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
  })
  status: string;

  @ApiProperty({
    description: 'Temps estimé de traitement en secondes',
    example: 3,
  })
  estimatedTime: number;

  @ApiProperty({
    description: 'Type de document uploadé',
    enum: DocumentType,
    example: DocumentType.RECEIPT_IMAGE,
  })
  documentType: DocumentType;
}

/**
 * DTO pour récupérer le statut d'un receipt
 */
export class ReceiptStatusDto {
  @ApiProperty({
    description: 'ID du receipt',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  receiptId: string;

  @ApiProperty({
    description: 'Statut actuel',
    example: 'COMPLETED',
    enum: ['PROCESSING', 'COMPLETED', 'FAILED', 'VALIDATED'],
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Résultat du traitement OCR (si complété)',
    type: OcrResultDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OcrResultDto)
  ocrResult?: OcrResultDto;

  @ApiPropertyOptional({
    description: "Message d'erreur (si échec)",
    example: 'Format de fichier non supporté',
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiProperty({
    description: 'Date de création',
    example: '2025-10-14T14:30:00Z',
  })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    example: '2025-10-14T14:30:05Z',
  })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;
}

/**
 * DTO pour valider/corriger un item de receipt
 */
export class UpdateReceiptItemDto {
  @ApiPropertyOptional({
    description: 'Nouvelle description',
    example: 'Pain complet bio 400g',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Nouvelle quantité',
    example: 2,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Nouveau prix unitaire',
    example: 1.3,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({
    description: 'ID du produit existant à associer',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Marquer comme validé',
    example: true,
  })
  @IsOptional()
  validated?: boolean;
}

/**
 * DTO pour ajouter un receipt validé à l'inventaire
 */
export class AddReceiptToInventoryDto {
  @ApiProperty({
    description: 'ID du receipt à ajouter',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  receiptId: string;

  @ApiPropertyOptional({
    description: 'IDs des items sélectionnés (tous si non spécifié)',
    type: [String],
    example: ['item-1', 'item-2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedItemIds?: string[];
}
