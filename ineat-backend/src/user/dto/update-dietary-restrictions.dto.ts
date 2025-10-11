import { IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDietaryRestrictionsDto {
  @ApiProperty({
    description: 'Liste des allergènes sélectionnés',
    example: ['gluten', 'lactose', 'nuts'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  allergens?: string[];

  @ApiProperty({
    description: 'Liste des régimes alimentaires sélectionnés',
    example: ['vegetarian', 'gluten-free'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  diets?: string[];
}

export interface DietaryPreferences {
  allergens: string[];
  diets: string[];
}