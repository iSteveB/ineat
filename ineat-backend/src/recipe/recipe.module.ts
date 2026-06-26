import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RecipeController } from './recipe.controller';
import { OpenAiRecipeService } from './services/openai-recipe.service';
import { RecipeService } from './services/recipe.service';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [RecipeController],
  providers: [RecipeService, OpenAiRecipeService],
})
export class RecipeModule {}
