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
		keywords: ['plat prepare', 'plat préparé', 'traiteur', 'reste', 'cuit'],
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
