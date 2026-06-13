import {
	CATEGORY_SHELF_LIFE_RULES,
	PRODUCT_SHELF_LIFE_RULES,
	type ShelfLifeRule,
	STORAGE_ALIASES,
	STORAGE_FALLBACK_DAYS,
	type StorageGroup,
} from '@/constants/expiryRules';

export interface ExpirySuggestionInput {
	productName?: string;
	categorySlug?: string;
	categoryName?: string;
	storageLocation?: string;
	purchaseDate: string;
}

export interface ExpirySuggestion {
	date: string;
	reason: string;
}

const normalize = (value?: string): string =>
	(value ?? '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/_/g, '-')
		.trim();

const formatDate = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number): Date => {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
};

const resolveStorageGroup = (storageLocation?: string): StorageGroup => {
	const normalized = normalize(storageLocation);

	for (const [group, aliases] of Object.entries(STORAGE_ALIASES)) {
		if (aliases.some((alias) => normalized.includes(normalize(alias)))) {
			return group as StorageGroup;
		}
	}

	return 'other';
};

const findRule = (rules: ShelfLifeRule[], text: string) => {
	const normalizedText = normalize(text);

	return rules.find((rule) =>
		rule.keywords.some((keyword) =>
			normalizedText.includes(normalize(keyword)),
		),
	);
};

export const getExpirySuggestion = ({
	productName,
	categorySlug,
	categoryName,
	storageLocation,
	purchaseDate,
}: ExpirySuggestionInput): ExpirySuggestion | null => {
	if (!purchaseDate) return null;

	const referenceDate = new Date(purchaseDate);
	if (Number.isNaN(referenceDate.getTime())) return null;

	const storageGroup = resolveStorageGroup(storageLocation);
	const productRule = findRule(PRODUCT_SHELF_LIFE_RULES, productName ?? '');
	const categoryRule = findRule(
		CATEGORY_SHELF_LIFE_RULES,
		`${categorySlug ?? ''} ${categoryName ?? ''}`,
	);
	const matchedRule = productRule ?? categoryRule;
	const days =
		matchedRule?.daysByStorage[storageGroup] ??
		matchedRule?.defaultDays ??
		STORAGE_FALLBACK_DAYS[storageGroup];

	return {
		date: formatDate(addDays(referenceDate, days)),
		reason: matchedRule
			? `${matchedRule.label} + ${storageLocation || 'stockage par défaut'}`
			: `stockage ${storageLocation || 'par défaut'}`,
	};
};
