import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({
    description: "Mot de passe actuel de l'utilisateur",
    example: 'AncienMotDePasse123',
  })
  @IsString({
    message: 'Le mot de passe actuel doit être une chaîne de caractères',
  })
  @IsNotEmpty({ message: 'Le mot de passe actuel est requis' })
  currentPassword: string;

  @ApiProperty({
    description: 'Nouveau mot de passe',
    minLength: 8,
    example: 'NouveauMotDePasse123',
  })
  @IsString({
    message: 'Le nouveau mot de passe doit être une chaîne de caractères',
  })
  @IsNotEmpty({ message: 'Le nouveau mot de passe est requis' })
  @MinLength(8, {
    message: 'Le nouveau mot de passe doit contenir au moins 8 caractères',
  })
  newPassword: string;
}
