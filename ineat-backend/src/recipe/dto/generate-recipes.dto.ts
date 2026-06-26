import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export enum GeneratedRecipeTypeDto {
  STARTER = 'STARTER',
  MAIN = 'MAIN',
  DESSERT = 'DESSERT',
}

export enum RecipeGenerationModeDto {
  STRICT = 'STRICT',
  FLEXIBLE = 'FLEXIBLE',
}

export class GenerateRecipesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(GeneratedRecipeTypeDto, { each: true })
  types: GeneratedRecipeTypeDto[];

  @IsInt()
  @Min(1)
  @Max(20)
  servings: number;

  @IsEnum(RecipeGenerationModeDto)
  mode: RecipeGenerationModeDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  extraIngredientLimit?: number;
}

export class RecipeIngredientPayloadDto {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  source: 'INVENTORY' | 'BASIC' | 'MISSING';
  productId?: string | null;
}

export class GeneratedRecipePayloadDto {
  clientId: string;
  type: GeneratedRecipeTypeDto;
  name: string;
  description?: string | null;
  preparationTime?: number | null;
  cookingTime?: number | null;
  servings: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  ingredients: RecipeIngredientPayloadDto[];
  basicIngredients: string[];
  missingIngredients: string[];
  steps: string[];
}

export class SaveGeneratedRecipeDto {
  @IsObject()
  recipe: GeneratedRecipePayloadDto;
}

export class CompleteRecipeDto {
  @IsBoolean()
  confirm: boolean;
}
