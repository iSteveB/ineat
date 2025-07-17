import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDateString,
  Min,
  Max,
  IsUUID,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ===== DTOs DE CRÉATION =====

export class CreateBudgetDto {
  @ApiProperty({
    description: 'Montant du budget en euros',
    example: 500,
    minimum: 0,
    maximum: 10000,
  })
  @IsNumber({}, { message: 'Le montant doit être un nombre' })
  @Min(0, { message: 'Le montant ne peut pas être négatif' })
  @Max(10000, { message: 'Le montant semble trop élevé' })
  amount: number;

  @ApiProperty({
    description: 'Date de début de la période (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsDateString(
    {},
    { message: 'Format de date invalide pour la date de début' },
  )
  periodStart: string;

  @ApiProperty({
    description: 'Date de fin de la période (YYYY-MM-DD)',
    example: '2024-01-31',
  })
  @IsDateString({}, { message: 'Format de date invalide pour la date de fin' })
  periodEnd: string;

  @ApiPropertyOptional({
    description: 'Indique si le budget est actif',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive doit être un booléen' })
  isActive?: boolean = true;
}

export class CreateExpenseDto {
  @ApiPropertyOptional({
    description:
      'ID du budget (optionnel, sera déterminé automatiquement si non fourni)',
    example: 'uuid-budget-id',
  })
  @IsOptional()
  @IsUUID(4, { message: "L'ID du budget doit être un UUID valide" })
  budgetId?: string;

  @ApiProperty({
    description: 'Montant de la dépense en euros',
    example: 25.5,
    minimum: 0,
  })
  @IsNumber({}, { message: 'Le montant doit être un nombre' })
  @Min(0, { message: 'Le montant ne peut pas être négatif' })
  amount: number;

  @ApiProperty({
    description: 'Date de la dépense (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @IsDateString({}, { message: 'Format de date invalide' })
  date: string;

  @ApiPropertyOptional({
    description: 'Source/magasin de la dépense',
    example: 'Carrefour',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'La source doit être une chaîne de caractères' })
  @Transform(({ value }) => value?.trim())
  source?: string;

  @ApiPropertyOptional({
    description: 'Notes sur la dépense',
    example: 'Courses de la semaine',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Les notes doivent être une chaîne de caractères' })
  @Transform(({ value }) => value?.trim())
  notes?: string;

  @ApiPropertyOptional({
    description: 'ID du ticket de caisse associé',
    example: 'receipt-123',
  })
  @IsOptional()
  @IsString({ message: "L'ID du reçu doit être une chaîne de caractères" })
  receiptId?: string;
}

// ===== DTOs DE MISE À JOUR =====

export class UpdateBudgetDto {
  @ApiPropertyOptional({
    description: 'Montant du budget en euros',
    example: 600,
    minimum: 0,
    maximum: 10000,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Le montant doit être un nombre' })
  @Min(0, { message: 'Le montant ne peut pas être négatif' })
  @Max(10000, { message: 'Le montant semble trop élevé' })
  amount?: number;

  @ApiPropertyOptional({
    description: 'Date de début de la période (YYYY-MM-DD)',
    example: '2024-02-01',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Format de date invalide pour la date de début' },
  )
  periodStart?: string;

  @ApiPropertyOptional({
    description: 'Date de fin de la période (YYYY-MM-DD)',
    example: '2024-02-29',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Format de date invalide pour la date de fin' })
  periodEnd?: string;

  @ApiPropertyOptional({
    description: 'Indique si le budget est actif',
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive doit être un booléen' })
  isActive?: boolean;
}

export class UpdateExpenseDto {
  @ApiPropertyOptional({
    description: 'Montant de la dépense en euros',
    example: 30.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Le montant doit être un nombre' })
  @Min(0, { message: 'Le montant ne peut pas être négatif' })
  amount?: number;

  @ApiPropertyOptional({
    description: 'Date de la dépense (YYYY-MM-DD)',
    example: '2024-01-20',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Format de date invalide' })
  date?: string;

  @ApiPropertyOptional({
    description: 'Source/magasin de la dépense',
    example: 'Leclerc',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'La source doit être une chaîne de caractères' })
  @Transform(({ value }) => value?.trim())
  source?: string;

  @ApiPropertyOptional({
    description: 'Notes sur la dépense',
    example: 'Courses du weekend',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Les notes doivent être une chaîne de caractères' })
  @Transform(({ value }) => value?.trim())
  notes?: string;
}

// ===== DTOs DE FILTRAGE =====

export class DateRangeDto {
  @ApiPropertyOptional({
    description: 'Date de début (ISO string)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Format de date invalide pour la date de début' },
  )
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Date de fin (ISO string)',
    example: '2024-01-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Format de date invalide pour la date de fin' })
  endDate?: string;
}

export class AmountRangeDto {
  @ApiPropertyOptional({
    description: 'Montant minimum',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Le montant minimum doit être un nombre' })
  @Min(0, { message: 'Le montant minimum ne peut pas être négatif' })
  min?: number;

  @ApiPropertyOptional({
    description: 'Montant maximum',
    example: 1000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Le montant maximum doit être un nombre' })
  @Min(0, { message: 'Le montant maximum ne peut pas être négatif' })
  max?: number;
}

export class BudgetFiltersDto {
  @ApiPropertyOptional({
    description: 'Filtrer par statut actif',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive doit être un booléen' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Plage de dates',
    type: DateRangeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  @IsObject({ message: 'dateRange doit être un objet' })
  dateRange?: DateRangeDto;

  @ApiPropertyOptional({
    description: 'Plage de montants',
    type: AmountRangeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AmountRangeDto)
  @IsObject({ message: 'amountRange doit être un objet' })
  amountRange?: AmountRangeDto;
}

export class ExpenseFiltersDto {
  @ApiPropertyOptional({
    description: 'ID du budget',
    example: 'uuid-budget-id',
  })
  @IsOptional()
  @IsUUID(4, { message: "L'ID du budget doit être un UUID valide" })
  budgetId?: string;

  @ApiPropertyOptional({
    description: 'Plage de dates',
    type: DateRangeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  @IsObject({ message: 'dateRange doit être un objet' })
  dateRange?: DateRangeDto;

  @ApiPropertyOptional({
    description: 'Plage de montants',
    type: AmountRangeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AmountRangeDto)
  @IsObject({ message: 'amountRange doit être un objet' })
  amountRange?: AmountRangeDto;

  @ApiPropertyOptional({
    description: 'Filtrer par source',
    example: 'Carrefour',
  })
  @IsOptional()
  @IsString({ message: 'La source doit être une chaîne de caractères' })
  source?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par présence de reçu',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'hasReceipt doit être un booléen' })
  hasReceipt?: boolean;
}

// ===== DTOs DE RÉPONSE =====

export class BudgetSetupStatusDto {
  @ApiProperty({
    description: "Indique si l'utilisateur doit configurer un budget",
    example: true,
  })
  needsSetup: boolean;

  @ApiProperty({
    description: 'Indique si un budget existe pour le mois actuel',
    example: false,
  })
  hasCurrentBudget: boolean;

  @ApiProperty({
    description:
      "Indique si l'utilisateur a déjà défini un budget précédemment",
    example: true,
  })
  hasPreviousBudget: boolean;

  @ApiPropertyOptional({
    description: 'Montant suggéré basé sur le dernier budget',
    example: 500,
  })
  suggestedAmount?: number;
}

// ===== DTOs SPÉCIAUX =====

export class CreateInitialBudgetDto {
  @ApiProperty({
    description: 'Montant du budget initial en euros',
    example: 500,
    minimum: 0,
    maximum: 10000,
  })
  @IsNumber({}, { message: 'Le montant doit être un nombre' })
  @Min(0, { message: 'Le montant ne peut pas être négatif' })
  @Max(10000, { message: 'Le montant semble trop élevé' })
  amount: number;
}

export class AddProductExpenseDto {
  @ApiProperty({
    description: 'Montant de la dépense produit en euros',
    example: 15.3,
    minimum: 0,
  })
  @IsNumber({}, { message: 'Le montant doit être un nombre' })
  @Min(0, { message: 'Le montant ne peut pas être négatif' })
  amount: number;

  @ApiPropertyOptional({
    description: "Source de l'achat",
    example: 'Monoprix',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'La source doit être une chaîne de caractères' })
  @Transform(({ value }) => value?.trim())
  source?: string;

  @ApiPropertyOptional({
    description: 'ID du ticket de caisse',
    example: 'receipt-456',
  })
  @IsOptional()
  @IsString({ message: "L'ID du reçu doit être une chaîne de caractères" })
  receiptId?: string;
}
