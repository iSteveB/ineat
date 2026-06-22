import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  GeneratedRecipePayloadDto,
  GeneratedRecipeTypeDto,
  RecipeGenerationModeDto,
} from '../dto/generate-recipes.dto';
import { BASIC_RECIPE_INGREDIENTS } from '../recipe.constants';

export interface RecipeInventoryIngredient {
  productId: string;
  name: string;
  category?: string | null;
}

export interface RecipeGenerationInput {
  types: GeneratedRecipeTypeDto[];
  servings: number;
  mode: RecipeGenerationModeDto;
  extraIngredientLimit: number;
  inventory: RecipeInventoryIngredient[];
  dietaryRestrictions: {
    allergens: string[];
    diets: string[];
  };
}

type OpenAiResponseOutputContent = {
  type?: string;
  text?: string;
};

type OpenAiResponseOutput = {
  content?: OpenAiResponseOutputContent[];
};

@Injectable()
export class OpenAiRecipeService {
  constructor(private readonly configService: ConfigService) {}

  async generateRecipes(
    input: RecipeGenerationInput,
  ): Promise<GeneratedRecipePayloadDto[]> {
    const apiKey = this.getApiKey();
    const model = this.configService.get<string>(
      'OPENAI_RECIPE_MODEL',
      'gpt-4.1-mini',
    );

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: this.buildSystemPrompt(),
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: JSON.stringify({
                  ...input,
                  basicIngredients: BASIC_RECIPE_INGREDIENTS,
                }),
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'recipe_generation_result',
            strict: true,
            schema: this.getRecipeSchema(),
          },
        },
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException(
        'La génération de recettes est momentanément indisponible',
      );
    }

    const data = await response.json();
    const text = this.extractOutputText(data);

    if (!text) {
      throw new InternalServerErrorException(
        'La génération de recettes a retourné une réponse vide',
      );
    }

    try {
      const parsed = JSON.parse(text) as { recipes: GeneratedRecipePayloadDto[] };
      return parsed.recipes.map((recipe) => ({
        ...recipe,
        clientId: recipe.clientId || randomUUID(),
      }));
    } catch {
      throw new InternalServerErrorException(
        'La génération de recettes a retourné un format invalide',
      );
    }
  }

  async generateRecipeImage(title: string): Promise<Buffer> {
    const apiKey = this.getApiKey();
    const model = this.configService.get<string>(
      'OPENAI_RECIPE_IMAGE_MODEL',
      'gpt-image-1',
    );

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: `Photo culinaire illustrative réaliste, style site de recette moderne, plat appétissant intitulé: ${title}. Aucun texte dans l'image.`,
        size: '1024x1024',
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException(
        "La génération de l'image est momentanément indisponible",
      );
    }

    const data = await response.json();
    const base64Image = data?.data?.[0]?.b64_json;

    if (!base64Image) {
      throw new InternalServerErrorException(
        "La génération de l'image a retourné une réponse vide",
      );
    }

    return Buffer.from(base64Image, 'base64');
  }

  private getApiKey(): string {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY_RECIPE');

    if (!apiKey) {
      throw new BadRequestException('OPENAI_API_KEY_RECIPE non configurée');
    }

    return apiKey;
  }

  private buildSystemPrompt(): string {
    return [
      'Tu génères des recettes de cuisine en français pour une application anti-gaspillage.',
      'Retourne uniquement le JSON conforme au schéma demandé.',
      'Génère exactement une recette par type demandé.',
      'En mode STRICT, utilise uniquement les ingrédients de l’inventaire et les basiques.',
      'En mode FLEXIBLE, ne dépasse jamais la limite d’ingrédients manquants.',
      'Les basiques sont seulement sel, poivre, eau, huile neutre et ne comptent pas comme manquants.',
      'Respecte strictement les restrictions alimentaires et allergènes utilisateur.',
      'Ne donne pas de conseils, variantes, nutrition, ni matériel.',
      'Les quantités peuvent être estimées pour le nombre de personnes demandé.',
    ].join('\n');
  }

  private extractOutputText(data: {
    output_text?: string;
    output?: OpenAiResponseOutput[];
  }): string | null {
    if (typeof data.output_text === 'string') {
      return data.output_text;
    }

    for (const output of data.output ?? []) {
      for (const content of output.content ?? []) {
        if (typeof content.text === 'string') {
          return content.text;
        }
      }
    }

    return null;
  }

  private getRecipeSchema() {
    const ingredient = {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'quantity', 'unit', 'source', 'productId'],
      properties: {
        name: { type: 'string' },
        quantity: { type: ['number', 'null'] },
        unit: { type: ['string', 'null'] },
        source: { type: 'string', enum: ['INVENTORY', 'BASIC', 'MISSING'] },
        productId: { type: ['string', 'null'] },
      },
    };

    return {
      type: 'object',
      additionalProperties: false,
      required: ['recipes'],
      properties: {
        recipes: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'clientId',
              'type',
              'name',
              'description',
              'preparationTime',
              'cookingTime',
              'servings',
              'difficulty',
              'ingredients',
              'basicIngredients',
              'missingIngredients',
              'steps',
            ],
            properties: {
              clientId: { type: 'string' },
              type: { type: 'string', enum: ['STARTER', 'MAIN', 'DESSERT'] },
              name: { type: 'string' },
              description: { type: ['string', 'null'] },
              preparationTime: { type: ['integer', 'null'] },
              cookingTime: { type: ['integer', 'null'] },
              servings: { type: 'integer' },
              difficulty: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD'] },
              ingredients: { type: 'array', items: ingredient },
              basicIngredients: { type: 'array', items: { type: 'string' } },
              missingIngredients: { type: 'array', items: { type: 'string' } },
              steps: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    };
  }
}
