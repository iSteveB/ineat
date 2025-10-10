import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  Query,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { AvatarService } from './avatar.service';
import {
  UpdateAvatarDto,
  AvatarUpdatedResponseDto,
  CloudinaryUploadParamsDto,
} from './dto/update-avatar.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

@ApiTags('Avatar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('avatar')
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  /**
   * Génère les paramètres pour l'upload sécurisé d'un avatar
   */
  @Get('upload-signature')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Générer les paramètres d'upload",
    description:
      "Génère les paramètres nécessaires pour permettre l'upload direct d'un avatar vers Cloudinary depuis le client",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paramètres générés avec succès',
    type: CloudinaryUploadParamsDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Utilisateur non trouvé',
  })
  async getUploadSignature(
    @Request() req: AuthenticatedRequest,
  ): Promise<CloudinaryUploadParamsDto> {
    const userId = req.user.id;
    return this.avatarService.generateAvatarUploadSignature(userId);
  }

  /**
   * Met à jour l'URL de l'avatar de l'utilisateur
   */
  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Mettre à jour l'avatar",
    description:
      "Met à jour l'URL de l'avatar de l'utilisateur après l'upload vers Cloudinary. Supprime automatiquement l'ancien avatar.",
  })
  @ApiBody({ type: UpdateAvatarDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Avatar mis à jour avec succès',
    type: AvatarUpdatedResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'URL invalide ou ne provient pas de Cloudinary',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Utilisateur non trouvé',
  })
  async updateAvatar(
    @Request() req: AuthenticatedRequest,
    @Body(ValidationPipe) updateAvatarDto: UpdateAvatarDto,
  ): Promise<AvatarUpdatedResponseDto> {
    const userId = req.user.id;
    return this.avatarService.updateAvatar(userId, updateAvatarDto);
  }

  /**
   * Supprime l'avatar de l'utilisateur
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Supprimer l'avatar",
    description:
      "Supprime l'avatar de l'utilisateur de Cloudinary et retire l'URL de la base de données",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Avatar supprimé avec succès',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Avatar supprimé avec succès' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "L'utilisateur n'a pas d'avatar",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Utilisateur non trouvé',
  })
  async deleteAvatar(
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    return this.avatarService.deleteAvatar(userId);
  }

  /**
   * Récupère l'URL optimisée de l'avatar
   */
  @Get('optimized')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Obtenir l'URL optimisée de l'avatar",
    description:
      "Retourne l'URL de l'avatar avec transformations optimisées (cercle, centré sur le visage, taille personnalisée)",
  })
  @ApiQuery({
    name: 'size',
    required: false,
    type: Number,
    description: 'Taille du cercle en pixels (défaut: 150)',
    example: 150,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "URL de l'avatar optimisé",
    schema: {
      type: 'object',
      properties: {
        avatarUrl: {
          type: 'string',
          nullable: true,
          example:
            'https://res.cloudinary.com/demo/image/upload/c_fill,g_face,h_150,r_max,w_150/avatars/user_123.jpg',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Utilisateur non trouvé',
  })
  async getOptimizedAvatar(
    @Request() req: AuthenticatedRequest,
    @Query('size', new ParseIntPipe({ optional: true })) size?: number,
  ): Promise<{ avatarUrl: string | null }> {
    const userId = req.user.id;
    return this.avatarService.getOptimizedAvatarUrl(userId, size);
  }
}
