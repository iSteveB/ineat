import { STORAGE_ALIASES, type StorageGroup } from '@/constants/expiryRules';

export type PackageStatus = 'UNOPENED' | 'OPENED';
export type PreparationStatus = 'RAW' | 'COOKED';

export interface ProductStateInput {
	productName?: string;
	categorySlug?: string;
	categoryName?: string;
	storageLocation?: string;
}

export interface ProductStateOptions {
	showPackageStatus: boolean;
	showPreparationStatus: boolean;
	defaultPackageStatus?: PackageStatus;
	defaultPreparationStatus?: PreparationStatus;
}

const normalize = (value?: string): string =>
	(value ?? '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/_/g, '-')
		.trim();

const resolveStorageGroup = (storageLocation?: string): StorageGroup => {
	const normalized = normalize(storageLocation);

	for (const [group, aliases] of Object.entries(STORAGE_ALIASES)) {
		if (aliases.some((alias) => normalized.includes(normalize(alias)))) {
			return group as StorageGroup;
		}
	}

	return 'other';
};

const hasAny = (text: string, keywords: string[]): boolean =>
	keywords.some((keyword) => text.includes(normalize(keyword)));

export const getProductStateOptions = ({
	productName,
	categorySlug,
	categoryName,
	storageLocation,
}: ProductStateInput): ProductStateOptions => {
	const storageGroup = resolveStorageGroup(storageLocation);
	const text = normalize(
		`${productName ?? ''} ${categorySlug ?? ''} ${categoryName ?? ''}`,
	);

	const packageStatusRelevant = hasAny(text, [
		'produits-laitiers',
		'lait',
		'yaourt',
		'fromage',
		'condiment',
		'sauce',
		'mayonnaise',
		'ketchup',
		'moutarde',
		'conserve',
		'bocal',
		'boisson',
		'jus',
		'soda',
	]);

	const cookedStorage = storageGroup === 'fridge' || storageGroup === 'freezer';
	const meatOrFish = hasAny(text, [
		'viandes-et-poissons',
		'viande',
		'poisson',
		'volaille',
		'fruits-de-mer',
	]);
	const cookedCandidate = hasAny(text, [
		'riz',
		'pates',
		'pates',
		'plat',
		'reste',
		'traiteur',
		'cuit',
	]);
	const preparationStatusRelevant =
		meatOrFish || (cookedStorage && cookedCandidate);

	return {
		showPackageStatus: packageStatusRelevant,
		showPreparationStatus: preparationStatusRelevant,
		defaultPackageStatus: packageStatusRelevant ? 'UNOPENED' : undefined,
		defaultPreparationStatus: preparationStatusRelevant
			? meatOrFish
				? 'RAW'
				: 'COOKED'
			: undefined,
	};
};
