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
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { ProfileType } from '../../../prisma/generated/prisma/client';
import { UpdateDietaryRestrictionsDto } from '../dto/update-dietary-restrictions.dto';
import { UpdatePasswordDto } from '../dto/update-password.dto';

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
@UseGuards(SessionAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Récupère les informations de l'utilisateur connecté
   */
  @Get('me')
  @ApiOperation({
    summary: "Récupérer les informations de l'utilisateur connecté",
    description:
      "Retourne les informations complètes de l'utilisateur actuellement authentifié",
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
    description:
      'Permet à un utilisateur de modifier son prénom, nom, email et type de profil',
  })
  @ApiBody({
    description: 'Champs à mettre à jour (tous optionnels)',
    schema: {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          description: "Prénom de l'utilisateur",
          example: 'Jean',
        },
        lastName: {
          type: 'string',
          description: "Nom de l'utilisateur",
          example: 'Dupont',
        },
        email: {
          type: 'string',
          format: 'email',
          description: "Adresse email de l'utilisateur",
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

  /**
   * Récupère les restrictions alimentaires de l'utilisateur
   */
  @Get('dietary-restrictions')
  @ApiOperation({
    summary: 'Récupérer les restrictions alimentaires',
    description:
      "Retourne les allergènes et régimes alimentaires de l'utilisateur",
  })
  @ApiResponse({
    status: 200,
    description: 'Restrictions alimentaires récupérées avec succès',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        data: {
          type: 'object',
          properties: {
            allergens: {
              type: 'array',
              items: { type: 'string' },
              example: ['gluten', 'lactose', 'nuts'],
            },
            diets: {
              type: 'array',
              items: { type: 'string' },
              example: ['vegetarian', 'gluten-free'],
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur non trouvé',
  })
  async getDietaryRestrictions(@Request() req: RequestWithUser) {
    return this.userService.getDietaryRestrictions(req.user.id);
  }

  /**
   * Met à jour les restrictions alimentaires de l'utilisateur
   */
  @Patch('dietary-restrictions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mettre à jour les restrictions alimentaires',
    description:
      'Permet à un utilisateur de modifier ses allergènes et régimes alimentaires',
  })
  @ApiBody({
    type: UpdateDietaryRestrictionsDto,
    description: 'Restrictions alimentaires à mettre à jour',
    examples: {
      example1: {
        summary: 'Exemple complet',
        value: {
          allergens: ['gluten', 'lactose', 'nuts'],
          diets: ['vegetarian', 'gluten-free'],
        },
      },
      example2: {
        summary: 'Mise à jour partielle - allergènes uniquement',
        value: {
          allergens: ['gluten', 'eggs'],
        },
      },
      example3: {
        summary: 'Mise à jour partielle - régimes uniquement',
        value: {
          diets: ['vegan'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Restrictions alimentaires mises à jour avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur non trouvé',
  })
  async updateDietaryRestrictions(
    @Request() req: RequestWithUser,
    @Body() updateData: UpdateDietaryRestrictionsDto,
  ) {
    return this.userService.updateDietaryRestrictions(req.user.id, updateData);
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mettre à jour le mot de passe',
    description:
      'Permet à un utilisateur authentifié de modifier son mot de passe local après vérification du mot de passe actuel',
  })
  @ApiBody({
    type: UpdatePasswordDto,
    description: 'Mot de passe actuel et nouveau mot de passe',
  })
  @ApiResponse({
    status: 200,
    description: 'Mot de passe mis à jour avec succès',
  })
  @ApiResponse({
    status: 400,
    description:
      'Mot de passe actuel invalide, nouveau mot de passe invalide ou compte sans mot de passe local',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async updatePassword(
    @Request() req: RequestWithUser,
    @Body() updateData: UpdatePasswordDto,
  ) {
    return this.userService.updatePassword(req.user.id, updateData);
  }
}
