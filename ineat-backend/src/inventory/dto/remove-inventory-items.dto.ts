import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RemoveInventoryItemsDto {
  @ApiProperty({
    description: "IDs des éléments d'inventaire à supprimer",
    example: [
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      '8d9a3d8b-0c5d-4f1f-a5dd-c264e7e14b88',
    ],
    type: [String],
  })
  @IsArray({
    message: 'La liste des produits à supprimer doit être un tableau',
  })
  @ArrayNotEmpty({ message: 'Au moins un produit doit être sélectionné' })
  @IsUUID('4', {
    each: true,
    message: 'Chaque ID de produit doit être un UUID valide',
  })
  ids: string[];
}
