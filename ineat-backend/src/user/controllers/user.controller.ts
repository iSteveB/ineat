import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProfileType } from '@prisma/client';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface UpdatePersonalInfoDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  profileType?: ProfileType;
}

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Récupère les informations de l'utilisateur connecté
   */
  @Get('me')
  @ApiOperation({
    summary: 'Récupérer les informations de l\'utilisateur connecté',
    description: 'Retourne les informations complètes de l\'utilisateur actuellement authentifié',
  })
  @ApiResponse({
    status: 200,
    description: 'Informations utilisateur récupérées avec succès',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async getCurrentUser(@Request() req: RequestWithUser) {
    return this.userService.getUserById(req.user.id);
  }

  /**
   * Met à jour les informations personnelles de l'utilisateur
   */
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mettre à jour les informations personnelles',
    description: 'Permet à un utilisateur de modifier son prénom, nom, email et type de profil',
  })
  @ApiBody({
    description: 'Champs à mettre à jour (tous optionnels)',
    schema: {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          description: 'Prénom de l\'utilisateur',
          example: 'Jean',
        },
        lastName: {
          type: 'string',
          description: 'Nom de l\'utilisateur',
          example: 'Dupont',
        },
        email: {
          type: 'string',
          format: 'email',
          description: 'Adresse email de l\'utilisateur',
          example: 'jean.dupont@example.com',
        },
        profileType: {
          type: 'string',
          enum: ['SINGLE', 'STUDENT', 'FAMILY'],
          description: 'Type de profil utilisateur',
          example: 'SINGLE',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profil mis à jour avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou email déjà utilisé',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur non trouvé',
  })
  async updatePersonalInfo(
    @Request() req: RequestWithUser,
    @Body() updateData: UpdatePersonalInfoDto,
  ) {
    return this.userService.updatePersonalInfo(req.user.id, updateData);
  }
}