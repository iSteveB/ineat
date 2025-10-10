import { IsString, IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * DTO pour la mise à jour de l'avatar utilisateur
 */
export class UpdateAvatarDto {
  @ApiProperty({
    description: "URL complète de l'avatar hébergé sur Cloudinary",
    example:
      'https://res.cloudinary.com/demo/image/upload/v1234567890/avatars/user_abc123.jpg',
  })
  @IsNotEmpty({ message: "L'URL de l'avatar est obligatoire" })
  @IsString({ message: "L'URL de l'avatar doit être une chaîne de caractères" })
  @IsUrl({}, { message: "L'URL de l'avatar doit être valide" })
  @Transform(({ value }) => value?.trim())
  avatarUrl: string;
}

/**
 * DTO pour les paramètres d'upload Cloudinary
 */
export class CloudinaryUploadParamsDto {
  @ApiProperty({
    description: 'Nom du cloud Cloudinary',
    example: 'your-cloud-name',
  })
  cloudName: string;

  @ApiProperty({
    description: "Preset d'upload Cloudinary",
    example: 'ineat_avatars',
  })
  uploadPreset: string;

  @ApiProperty({
    description: 'Dossier de destination',
    example: 'avatars/user-id-123',
  })
  folder: string;
}

/**
 * DTO pour la réponse après mise à jour de l'avatar
 */
export class AvatarUpdatedResponseDto {
  @ApiProperty({
    description: "Identifiant de l'utilisateur",
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: "URL de l'avatar mis à jour",
    example:
      'https://res.cloudinary.com/demo/image/upload/v1234567890/avatars/user_abc123.jpg',
  })
  avatarUrl: string;

  @ApiProperty({
    description: 'Message de confirmation',
    example: 'Avatar mis à jour avec succès',
  })
  message: string;
}
