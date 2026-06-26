export const BASIC_RECIPE_INGREDIENTS = [
  'sel',
  'poivre',
  'eau',
  'huile neutre',
] as const;

export const BASIC_RECIPE_INGREDIENT_SET = new Set<string>(
  BASIC_RECIPE_INGREDIENTS,
);
