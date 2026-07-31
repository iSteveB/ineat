import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const DELETE_ACCOUNT_CONFIRMATION =
  'SUPPRIMER DÉFINITIVEMENT MON COMPTE' as const;

export class DeleteAccountDto {
  @ApiProperty({
    example: DELETE_ACCOUNT_CONFIRMATION,
    description: 'Phrase de confirmation requise pour supprimer le compte.',
  })
  @IsIn([DELETE_ACCOUNT_CONFIRMATION], {
    message: 'La phrase de confirmation est incorrecte',
  })
  confirmation!: typeof DELETE_ACCOUNT_CONFIRMATION;
}
