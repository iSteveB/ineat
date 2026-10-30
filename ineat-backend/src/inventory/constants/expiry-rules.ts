export type StorageGroup =
  | 'fridge'
  | 'freezer'
  | 'pantry'
  | 'cellar'
  | 'ambient'
  | 'other';

export interface ShelfLifeRule {
  id: string;
  label: string;
  keywords: string[];
  daysByStorage: Partial<Record<StorageGroup, number>>;
  defaultDays: number;
}

export const PRESERVATION_CATEGORIES = [
  'RAW_RED_MEAT_WHOLE',
  'RAW_GROUND_MEAT',
  'RAW_POULTRY',
  'RAW_SAUSAGE',
  'RAW_LEAN_FISH',
  'RAW_FATTY_FISH',
  'RAW_SHELLFISH',
  'COOKED_SEAFOOD',
  'COOKED_MEAT',
  'COOKED_POULTRY',
  'COOKED_FISH',
  'HOMEMADE_MEAL',
  'HOMEMADE_SOUP',
  'DELI_MEAT',
  'BACON',
  'MILK',
  'YOGURT',
  'FRESH_CHEESE',
  'SOFT_CHEESE',
  'SEMI_FIRM_CHEESE',
  'HARD_CHEESE',
  'SHELL_EGGS',
  'HARD_BOILED_EGGS',
  'COMPOSED_SALAD',
  'COOKED_VEGETABLES',
  'FRESH_GREEN_BEANS',
  'FRESH_CARROTS',
  'FRESH_ZUCCHINI',
  'GREEN_SALAD',
  'FRESH_MUSHROOMS',
  'CUT_FRUIT_OR_VEGETABLE',
  'BREAD',
] as const;

export type PreservationCategory = (typeof PRESERVATION_CATEGORIES)[number];

export const PRESERVATION_SHELF_LIFE_DAYS: Record<
  PreservationCategory,
  Partial<Record<StorageGroup, number>>
> = {
  RAW_RED_MEAT_WHOLE: { fridge: 2, freezer: 240 },
  RAW_GROUND_MEAT: { fridge: 1, freezer: 60 },
  RAW_POULTRY: { fridge: 2, freezer: 180 },
  RAW_SAUSAGE: { fridge: 1, freezer: 30 },
  RAW_LEAN_FISH: { fridge: 3, freezer: 180 },
  RAW_FATTY_FISH: { fridge: 3, freezer: 60 },
  RAW_SHELLFISH: { fridge: 1 },
  COOKED_SEAFOOD: { fridge: 1, freezer: 60 },
  COOKED_MEAT: { fridge: 3, freezer: 60 },
  COOKED_POULTRY: { fridge: 3, freezer: 120 },
  COOKED_FISH: { fridge: 3, freezer: 120 },
  HOMEMADE_MEAL: { fridge: 2, freezer: 60 },
  HOMEMADE_SOUP: { fridge: 2, freezer: 120 },
  DELI_MEAT: { fridge: 3, freezer: 30 },
  BACON: { fridge: 7, freezer: 30 },
  MILK: { fridge: 7 },
  YOGURT: { fridge: 14 },
  FRESH_CHEESE: { fridge: 5 },
  SOFT_CHEESE: { fridge: 7 },
  SEMI_FIRM_CHEESE: { fridge: 14, freezer: 60 },
  HARD_CHEESE: { fridge: 30, freezer: 90 },
  SHELL_EGGS: { fridge: 21 },
  HARD_BOILED_EGGS: { fridge: 7 },
  COMPOSED_SALAD: { fridge: 3 },
  COOKED_VEGETABLES: { fridge: 5, freezer: 60 },
  FRESH_GREEN_BEANS: { fridge: 5, freezer: 240 },
  FRESH_CARROTS: { fridge: 14, freezer: 300 },
  FRESH_ZUCCHINI: { fridge: 7, freezer: 300 },
  GREEN_SALAD: { fridge: 7 },
  FRESH_MUSHROOMS: { fridge: 7 },
  CUT_FRUIT_OR_VEGETABLE: { fridge: 5 },
  BREAD: { freezer: 30, pantry: 2, ambient: 2 },
};

export const STORAGE_ALIASES: Record<StorageGroup, string[]> = {
  fridge: ['frigo', 'refrigerateur', 'réfrigérateur', 'refrigerator'],
  freezer: ['congelateur', 'congélateur', 'freezer'],
  pantry: ['placard', 'pantry', 'epicerie', 'épicerie'],
  cellar: ['cellier', 'cave', 'cellar'],
  ambient: ['plan-de-travail', 'plan de travail', 'ambient'],
  other: ['autre', 'other'],
};

export const PRODUCT_SHELF_LIFE_RULES: ShelfLifeRule[] = [
  {
    id: 'pain',
    label: 'pain',
    keywords: ['pain', 'baguette', 'brioche'],
    daysByStorage: { ambient: 3, pantry: 5, fridge: 7, freezer: 90 },
    defaultDays: 4,
  },
  {
    id: 'oeufs',
    label: 'oeufs',
    keywords: ['oeuf', 'œuf', 'oeufs', 'œufs'],
    daysByStorage: { fridge: 28, pantry: 14 },
    defaultDays: 21,
  },
  {
    id: 'riz-cuit',
    label: 'riz cuit',
    keywords: ['riz cuit'],
    daysByStorage: { fridge: 3, freezer: 30 },
    defaultDays: 3,
  },
  {
    id: 'pates-cuites',
    label: 'pâtes cuites',
    keywords: ['pates cuites', 'pâtes cuites'],
    daysByStorage: { fridge: 3, freezer: 30 },
    defaultDays: 3,
  },
];

export const CATEGORY_SHELF_LIFE_RULES: ShelfLifeRule[] = [
  {
    id: 'viandes-et-poissons',
    label: 'viandes et poissons',
    keywords: [
      'viandes-et-poissons',
      'viande',
      'poisson',
      'volaille',
      'boucherie',
      'poissonnerie',
      'fruits-de-mer',
      'fruit de mer',
    ],
    daysByStorage: { fridge: 3, freezer: 120 },
    defaultDays: 3,
  },
  {
    id: 'produits-laitiers',
    label: 'produits laitiers',
    keywords: [
      'produits-laitiers',
      'laitier',
      'lait',
      'yaourt',
      'fromage',
      'cremerie',
      'crémerie',
    ],
    daysByStorage: { fridge: 14, freezer: 90, pantry: 180 },
    defaultDays: 14,
  },
  {
    id: 'fruits-et-legumes',
    label: 'fruits et légumes',
    keywords: ['fruits-et-legumes', 'fruit', 'legume', 'légume', 'frais'],
    daysByStorage: { fridge: 7, pantry: 5, cellar: 14, ambient: 4 },
    defaultDays: 7,
  },
  {
    id: 'surgeles',
    label: 'surgelés',
    keywords: ['surgeles', 'surgelés', 'surgele', 'surgelé'],
    daysByStorage: { freezer: 180, fridge: 1 },
    defaultDays: 180,
  },
  {
    id: 'conserves',
    label: 'conserves',
    keywords: ['conserve', 'bocal'],
    daysByStorage: { pantry: 730, cellar: 730, fridge: 5 },
    defaultDays: 730,
  },
  {
    id: 'epicerie-sucree',
    label: 'épicerie sucrée',
    keywords: [
      'epicerie-sucree',
      'épicerie sucrée',
      'sucre',
      'biscuits',
      'chocolat',
      'cereales sucrees',
      'céréales sucrées',
    ],
    daysByStorage: { pantry: 730, cellar: 730, ambient: 180 },
    defaultDays: 730,
  },
  {
    id: 'epicerie-salee',
    label: 'épicerie salée',
    keywords: [
      'epicerie-salee',
      'épicerie salée',
      'epicerie',
      'épicerie',
      'sec',
      'pates',
      'pâtes',
      'riz',
      'cereales',
      'céréales',
      'farine',
    ],
    daysByStorage: { pantry: 365, cellar: 365, ambient: 180 },
    defaultDays: 365,
  },
  {
    id: 'condiments',
    label: 'condiments',
    keywords: ['condiment', 'sauce', 'moutarde', 'ketchup', 'mayonnaise'],
    daysByStorage: { pantry: 365, fridge: 30 },
    defaultDays: 180,
  },
  {
    id: 'boissons',
    label: 'boissons',
    keywords: ['boissons', 'boisson', 'jus', 'soda', 'eau'],
    daysByStorage: { pantry: 180, fridge: 7, cellar: 365 },
    defaultDays: 180,
  },
  {
    id: 'plats-prepares',
    label: 'plats préparés',
    keywords: [
      'plats-prepares',
      'plats préparés',
      'plat prepare',
      'plat préparé',
      'traiteur',
      'reste',
      'cuit',
    ],
    daysByStorage: { fridge: 3, freezer: 60 },
    defaultDays: 3,
  },
  {
    id: 'autres',
    label: 'autres produits',
    keywords: ['autres', 'autre'],
    daysByStorage: {},
    defaultDays: 30,
  },
];

export const STORAGE_FALLBACK_DAYS: Record<StorageGroup, number> = {
  fridge: 7,
  freezer: 180,
  pantry: 365,
  cellar: 365,
  ambient: 5,
  other: 30,
};
