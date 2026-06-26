import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequiresCapability } from '../auth/decorators/requires-capability.decorator';
import { CapabilityGuard } from '../auth/guards/capability.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import {
  CompleteRecipeDto,
  GenerateRecipesDto,
  SaveGeneratedRecipeDto,
} from './dto/generate-recipes.dto';
import { RecipeService } from './services/recipe.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

@ApiTags('Recipes')
@ApiBearerAuth()
@UseGuards(SessionAuthGuard, CapabilityGuard)
@RequiresCapability('canUseRecipes')
@Controller('recipes')
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @RequiresCapability('canGenerateAiRecipes')
  generateRecipes(
    @Req() req: AuthenticatedRequest,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: GenerateRecipesDto,
  ) {
    return this.recipeService.generate(req.user.id, dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  saveGeneratedRecipe(
    @Req() req: AuthenticatedRequest,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: SaveGeneratedRecipeDto,
  ) {
    return this.recipeService.saveGeneratedRecipe(req.user.id, dto);
  }

  @Get()
  listSavedRecipes(@Req() req: AuthenticatedRequest) {
    return this.recipeService.listSavedRecipes(req.user.id);
  }

  @Get(':id')
  getSavedRecipe(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.recipeService.getSavedRecipe(req.user.id, id);
  }

  @Get(':id/completion-preview')
  getCompletionPreview(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.recipeService.getCompletionPreview(req.user.id, id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  completeRecipe(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CompleteRecipeDto,
  ) {
    return this.recipeService.completeRecipe(req.user.id, id, dto.confirm);
  }
}
