import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ConsumeInventoryItemDto {
  @ApiProperty({
    description: 'Quantité à consommer',
    example: 1,
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'La quantité consommée doit être un nombre' })
  @Min(0.01, { message: 'La quantité consommée doit être supérieure à 0' })
  quantityConsumed: number;
}
