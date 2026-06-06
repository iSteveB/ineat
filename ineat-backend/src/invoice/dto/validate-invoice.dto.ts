import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class ValidateInvoiceDto {
  @ApiProperty({
    type: [String],
    description: 'IDs des lignes de facture à valider',
  })
  @IsArray({ message: 'La liste des lignes à valider doit être un tableau' })
  @ArrayNotEmpty({ message: 'Au moins une ligne doit être sélectionnée' })
  @IsUUID('4', {
    each: true,
    message: 'Chaque ID de ligne doit être un UUID valide',
  })
  invoiceItemIds: string[];
}

export class ValidateInvoiceResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  invoiceId: string;

  @ApiProperty()
  validatedItemCount: number;

  @ApiProperty()
  skippedItemCount: number;

  @ApiProperty()
  inventoryItemCount: number;

  @ApiProperty()
  expenseCount: number;

  @ApiProperty()
  totalBudgetAmount: number;

  @ApiProperty()
  message: string;
}
